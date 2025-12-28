use crate::redis_client::SshAuthMethod;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    #[serde(skip)] // Don't serialize password to disk
    #[allow(dead_code)]
    pub password: Option<String>,
    pub database: u8,
    pub use_tls: bool,
    pub ssh_tunnel: Option<StoredSshTunnelConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredSshTunnelConfig {
    pub enabled: bool,
    pub ssh_host: String,
    pub ssh_port: u16,
    pub ssh_username: String,
    pub auth_method: SshAuthMethod,
    #[serde(skip)] // Don't serialize SSH password to disk
    #[allow(dead_code)] // Will be populated when loading from keychain
    pub ssh_password: Option<String>,
    pub ssh_private_key_path: Option<String>,
    #[serde(skip)] // Don't serialize passphrase to disk
    #[allow(dead_code)] // Will be populated when loading from keychain
    pub ssh_passphrase: Option<String>,
    pub local_port: Option<u16>,
}

pub struct ConnectionStore {
    store_path: PathBuf,
}

impl ConnectionStore {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .context("Failed to get app data directory")?;

        // Create app data directory if it doesn't exist
        fs::create_dir_all(&app_data_dir).context("Failed to create app data directory")?;

        let store_path = app_data_dir.join("connections.json");

        Ok(Self { store_path })
    }

    pub fn load_connections(&self) -> Result<Vec<StoredConnection>> {
        if !self.store_path.exists() {
            return Ok(Vec::new());
        }

        let contents =
            fs::read_to_string(&self.store_path).context("Failed to read connections file")?;

        let connections: Vec<StoredConnection> =
            serde_json::from_str(&contents).context("Failed to parse connections file")?;

        Ok(connections)
    }

    pub fn save_connections(&self, connections: &[StoredConnection]) -> Result<()> {
        let json =
            serde_json::to_string_pretty(connections).context("Failed to serialize connections")?;

        fs::write(&self.store_path, json).context("Failed to write connections file")?;

        Ok(())
    }

    pub fn add_connection(&self, connection: StoredConnection) -> Result<()> {
        let mut connections = self.load_connections()?;

        // Remove existing connection with same ID if it exists
        connections.retain(|c| c.id != connection.id);

        connections.push(connection);
        self.save_connections(&connections)?;

        Ok(())
    }

    pub fn remove_connection(&self, connection_id: &str) -> Result<bool> {
        let mut connections = self.load_connections()?;
        let original_len = connections.len();

        connections.retain(|c| c.id != connection_id);

        if connections.len() < original_len {
            self.save_connections(&connections)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    #[allow(dead_code)]
    pub fn update_connection(&self, connection: StoredConnection) -> Result<()> {
        let mut connections = self.load_connections()?;

        if let Some(existing) = connections.iter_mut().find(|c| c.id == connection.id) {
            *existing = connection;
            self.save_connections(&connections)?;
            Ok(())
        } else {
            Err(anyhow::anyhow!("Connection not found"))
        }
    }
}

// Password management using OS keychain
pub struct PasswordStore {
    service_name: String,
}

impl PasswordStore {
    pub fn new() -> Self {
        Self {
            service_name: "com.redistal.app".to_string(),
        }
    }

    pub fn save_password(&self, connection_id: &str, password: &str) -> Result<()> {
        let entry = keyring::Entry::new(&self.service_name, connection_id)
            .context("Failed to create keyring entry")?;

        entry
            .set_password(password)
            .context("Failed to save password to keyring")?;

        Ok(())
    }

    pub fn get_password(&self, connection_id: &str) -> Result<Option<String>> {
        let entry = keyring::Entry::new(&self.service_name, connection_id)
            .context("Failed to create keyring entry")?;

        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(anyhow::anyhow!(
                "Failed to get password from keyring: {}",
                e
            )),
        }
    }

    pub fn delete_password(&self, connection_id: &str) -> Result<()> {
        let entry = keyring::Entry::new(&self.service_name, connection_id)
            .context("Failed to create keyring entry")?;

        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()), // Already deleted
            Err(e) => Err(anyhow::anyhow!(
                "Failed to delete password from keyring: {}",
                e
            )),
        }
    }

    // SSH password storage
    #[allow(dead_code)] // Used when loading connections from storage
    pub fn get_ssh_password(&self, connection_id: &str) -> Result<Option<String>> {
        let entry = keyring::Entry::new(
            &self.service_name,
            &format!("{}_ssh_password", connection_id),
        )
        .context("Failed to create keyring entry")?;

        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(anyhow::anyhow!(
                "Failed to get SSH password from keyring: {}",
                e
            )),
        }
    }

    pub fn save_ssh_password(&self, connection_id: &str, password: &str) -> Result<()> {
        let entry = keyring::Entry::new(
            &self.service_name,
            &format!("{}_ssh_password", connection_id),
        )
        .context("Failed to create keyring entry")?;

        entry
            .set_password(password)
            .context("Failed to save SSH password to keyring")?;

        Ok(())
    }

    #[allow(dead_code)] // Used when deleting connections
    pub fn delete_ssh_password(&self, connection_id: &str) -> Result<()> {
        let entry = keyring::Entry::new(
            &self.service_name,
            &format!("{}_ssh_password", connection_id),
        )
        .context("Failed to create keyring entry")?;

        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(anyhow::anyhow!(
                "Failed to delete SSH password from keyring: {}",
                e
            )),
        }
    }

    // SSH passphrase storage (for private keys)
    #[allow(dead_code)] // Used when loading connections from storage
    pub fn get_ssh_passphrase(&self, connection_id: &str) -> Result<Option<String>> {
        let entry = keyring::Entry::new(
            &self.service_name,
            &format!("{}_ssh_passphrase", connection_id),
        )
        .context("Failed to create keyring entry")?;

        match entry.get_password() {
            Ok(passphrase) => Ok(Some(passphrase)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(anyhow::anyhow!(
                "Failed to get SSH passphrase from keyring: {}",
                e
            )),
        }
    }

    pub fn save_ssh_passphrase(&self, connection_id: &str, passphrase: &str) -> Result<()> {
        let entry = keyring::Entry::new(
            &self.service_name,
            &format!("{}_ssh_passphrase", connection_id),
        )
        .context("Failed to create keyring entry")?;

        entry
            .set_password(passphrase)
            .context("Failed to save SSH passphrase to keyring")?;

        Ok(())
    }

    #[allow(dead_code)] // Used when deleting connections
    pub fn delete_ssh_passphrase(&self, connection_id: &str) -> Result<()> {
        let entry = keyring::Entry::new(
            &self.service_name,
            &format!("{}_ssh_passphrase", connection_id),
        )
        .context("Failed to create keyring entry")?;

        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(anyhow::anyhow!(
                "Failed to delete SSH passphrase from keyring: {}",
                e
            )),
        }
    }
}

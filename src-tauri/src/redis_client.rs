use crate::ssh_tunnel::SshTunnel;
use redis::{Client, Connection, RedisResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;

const REDIS_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const REDIS_HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SshAuthMethod {
    Password,
    PrivateKey,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshTunnelConfig {
    pub enabled: bool,
    pub ssh_host: String,
    pub ssh_port: u16,
    pub ssh_username: String,
    pub auth_method: SshAuthMethod,
    pub ssh_password: Option<String>,
    pub ssh_private_key_path: Option<String>,
    pub ssh_passphrase: Option<String>,
    pub local_port: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: u8,
    pub use_tls: bool,
    pub ssh_tunnel: Option<SshTunnelConfig>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ConnectionStatus {
    pub id: String,
    pub connected: bool,
    pub error: Option<String>,
}

pub struct RedisConnectionManager {
    connections: Arc<Mutex<HashMap<String, Client>>>,
    ssh_tunnels: Arc<Mutex<HashMap<String, SshTunnel>>>,
}

impl RedisConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
            ssh_tunnels: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn connect(&self, config: ConnectionConfig) -> RedisResult<ConnectionStatus> {
        use std::time::Instant;
        let start = Instant::now();

        // Establish SSH tunnel if configured
        let tunnel_result = if let Some(ssh_config) = &config.ssh_tunnel {
            if ssh_config.enabled {
                match SshTunnel::new(ssh_config, &config.host, config.port) {
                    Ok(tunnel) => {
                        let mut tunnels = self.ssh_tunnels.lock().unwrap();
                        tunnels.insert(config.id.clone(), tunnel);
                        eprintln!("Redis: SSH tunnel established in {:?}", start.elapsed());
                        Ok(())
                    }
                    Err(e) => Err(e),
                }
            } else {
                Ok(())
            }
        } else {
            Ok(())
        };

        // If SSH tunnel failed, return error
        if let Err(e) = tunnel_result {
            return Ok(ConnectionStatus {
                id: config.id,
                connected: false,
                error: Some(format!("SSH tunnel error: {}", e)),
            });
        }

        let conn_str = self.build_connection_string(&config);
        eprintln!("Redis: Connecting to {}", conn_str.replace(|c: char| c.is_ascii_alphanumeric() || c == ':' || c == '/' || c == '@' || c == '.' || c == '-', "*"));

        match Client::open(conn_str) {
            Ok(client) => {
                eprintln!("Redis: Client created in {:?}", start.elapsed());

                // Perform the initial handshake (AUTH/SELECT) in a bounded time to avoid hangs
                let client_for_handshake = client.clone();
                let (tx, rx) = mpsc::channel();

                std::thread::spawn(move || {
                    let result = client_for_handshake
                        .get_connection_with_timeout(REDIS_CONNECT_TIMEOUT);
                    let _ = tx.send(result);
                });

                let mut conn = match rx.recv_timeout(REDIS_HANDSHAKE_TIMEOUT) {
                    Ok(Ok(conn)) => conn,
                    Ok(Err(e)) => {
                        let mut tunnels = self.ssh_tunnels.lock().unwrap();
                        tunnels.remove(&config.id);
                        return Ok(ConnectionStatus {
                            id: config.id,
                            connected: false,
                            error: Some(e.to_string()),
                        });
                    }
                    Err(_) => {
                        let mut tunnels = self.ssh_tunnels.lock().unwrap();
                        tunnels.remove(&config.id);
                        return Ok(ConnectionStatus {
                            id: config.id,
                            connected: false,
                            error: Some(format!(
                                "Redis connection timed out after {:?}",
                                REDIS_HANDSHAKE_TIMEOUT
                            )),
                        });
                    }
                };

                eprintln!("Redis: Connection established in {:?}", start.elapsed());
                redis::cmd("PING").query::<String>(&mut conn)?;
                eprintln!("Redis: PING successful in {:?}", start.elapsed());

                let mut connections = self.connections.lock().unwrap();
                connections.insert(config.id.clone(), client);

                Ok(ConnectionStatus {
                    id: config.id,
                    connected: true,
                    error: None,
                })
            }
            Err(e) => {
                // Cleanup SSH tunnel if Redis connection failed
                let mut tunnels = self.ssh_tunnels.lock().unwrap();
                tunnels.remove(&config.id);

                Ok(ConnectionStatus {
                    id: config.id,
                    connected: false,
                    error: Some(e.to_string()),
                })
            }
        }
    }

    pub fn disconnect(&self, connection_id: &str) -> bool {
        let mut connections = self.connections.lock().unwrap();
        let mut tunnels = self.ssh_tunnels.lock().unwrap();

        // Remove both connection and tunnel (if exists)
        let conn_removed = connections.remove(connection_id).is_some();
        tunnels.remove(connection_id);

        conn_removed
    }

    pub fn get_connection(&self, connection_id: &str) -> Option<Connection> {
        let connections = self.connections.lock().unwrap();
        connections
            .get(connection_id)
            .and_then(|client| client.get_connection().ok())
    }

    fn build_connection_string(&self, config: &ConnectionConfig) -> String {
        let protocol = if config.use_tls { "rediss" } else { "redis" };

        let auth = match (&config.username, &config.password) {
            (Some(user), Some(pass)) => format!("{}:{}@", user, pass),
            (None, Some(pass)) => format!(":{}@", pass),
            _ => String::new(),
        };

        // Use localhost and tunnel's local port if SSH tunnel is active
        let (host, port) = if let Some(ssh_config) = &config.ssh_tunnel {
            if ssh_config.enabled {
                let tunnels = self.ssh_tunnels.lock().unwrap();
                if let Some(tunnel) = tunnels.get(&config.id) {
                    ("127.0.0.1".to_string(), tunnel.local_port())
                } else {
                    (config.host.clone(), config.port)
                }
            } else {
                (config.host.clone(), config.port)
            }
        } else {
            (config.host.clone(), config.port)
        };

        format!(
            "{}://{}{}:{}/{}",
            protocol, auth, host, port, config.database
        )
    }
}

impl Default for RedisConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}

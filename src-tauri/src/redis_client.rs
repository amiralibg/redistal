use redis::{Client, Connection, RedisResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

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
}

#[derive(Debug, Clone, Serialize)]
pub struct ConnectionStatus {
    pub id: String,
    pub connected: bool,
    pub error: Option<String>,
}

pub struct RedisConnectionManager {
    connections: Arc<Mutex<HashMap<String, Client>>>,
}

impl RedisConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn connect(&self, config: ConnectionConfig) -> RedisResult<ConnectionStatus> {
        let conn_str = self.build_connection_string(&config);

        match Client::open(conn_str) {
            Ok(client) => {
                let mut conn = client.get_connection()?;
                redis::cmd("PING").query::<String>(&mut conn)?;

                let mut connections = self.connections.lock().unwrap();
                connections.insert(config.id.clone(), client);

                Ok(ConnectionStatus {
                    id: config.id,
                    connected: true,
                    error: None,
                })
            }
            Err(e) => Ok(ConnectionStatus {
                id: config.id,
                connected: false,
                error: Some(e.to_string()),
            }),
        }
    }

    pub fn disconnect(&self, connection_id: &str) -> bool {
        let mut connections = self.connections.lock().unwrap();
        connections.remove(connection_id).is_some()
    }

    pub fn get_connection(&self, connection_id: &str) -> Option<Connection> {
        let connections = self.connections.lock().unwrap();
        connections.get(connection_id).and_then(|client| client.get_connection().ok())
    }

    fn build_connection_string(&self, config: &ConnectionConfig) -> String {
        let protocol = if config.use_tls { "rediss" } else { "redis" };

        let auth = match (&config.username, &config.password) {
            (Some(user), Some(pass)) => format!("{}:{}@", user, pass),
            (None, Some(pass)) => format!(":{}@", pass),
            _ => String::new(),
        };

        format!(
            "{}://{}{}:{}/{}",
            protocol, auth, config.host, config.port, config.database
        )
    }
}

impl Default for RedisConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}

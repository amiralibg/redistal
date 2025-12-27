use crate::connection_store::{ConnectionStore, PasswordStore, StoredConnection};
use crate::redis_client::{ConnectionConfig, ConnectionStatus, RedisConnectionManager};
use redis::Commands;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub keys: Vec<String>,
    pub cursor: u64,
    pub has_more: bool,
}

pub struct AppState {
    pub redis_manager: Mutex<RedisConnectionManager>,
    pub connection_store: Mutex<ConnectionStore>,
    pub password_store: PasswordStore,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RedisKey {
    pub name: String,
    pub key_type: String,
    pub ttl: i64,
    pub size: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RedisValue {
    pub value: String,
    pub key_type: String,
}

#[tauri::command]
pub async fn connect_to_redis(
    config: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<ConnectionStatus, String> {
    let manager = state.redis_manager.lock().unwrap();
    manager.connect(config).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn disconnect_from_redis(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let manager = state.redis_manager.lock().unwrap();
    Ok(manager.disconnect(&connection_id))
}

#[tauri::command]
pub async fn get_keys(
    connection_id: String,
    pattern: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    // Avoid `KEYS` which can block Redis on large datasets.
    // We keep the existing frontend contract (return a Vec<String>) but implement it via SCAN.
    const SCAN_COUNT: usize = 500;
    const MAX_KEYS: usize = 10_000;

    let mut cursor: u64 = 0;
    let mut seen: HashSet<String> = HashSet::new();

    loop {
        let (next_cursor, batch): (u64, Vec<String>) = redis::cmd("SCAN")
            .arg(cursor)
            .arg("MATCH")
            .arg(&pattern)
            .arg("COUNT")
            .arg(SCAN_COUNT)
            .query(&mut conn)
            .map_err(|e| e.to_string())?;

        for key in batch {
            if seen.len() >= MAX_KEYS {
                break;
            }
            seen.insert(key);
        }

        if seen.len() >= MAX_KEYS || next_cursor == 0 {
            break;
        }
        cursor = next_cursor;
    }

    let mut keys: Vec<String> = seen.into_iter().collect();
    keys.sort();
    Ok(keys)
}

#[tauri::command]
pub async fn scan_keys(
    connection_id: String,
    pattern: String,
    cursor: u64,
    count: usize,
    state: State<'_, AppState>,
) -> Result<ScanResult, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    // Execute SCAN command with provided cursor
    let (next_cursor, batch): (u64, Vec<String>) = redis::cmd("SCAN")
        .arg(cursor)
        .arg("MATCH")
        .arg(&pattern)
        .arg("COUNT")
        .arg(count)
        .query(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(ScanResult {
        keys: batch,
        cursor: next_cursor,
        has_more: next_cursor != 0,
    })
}

#[tauri::command]
pub async fn get_key_info(
    connection_id: String,
    key: String,
    state: State<'_, AppState>,
) -> Result<RedisKey, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    let key_type: String = conn.key_type(&key).map_err(|e| e.to_string())?;
    let ttl: i64 = conn.ttl(&key).map_err(|e| e.to_string())?;

    let size = match key_type.as_str() {
        "string" => None,
        "list" => Some(conn.llen::<_, usize>(&key).map_err(|e| e.to_string())?),
        "set" => Some(conn.scard::<_, usize>(&key).map_err(|e| e.to_string())?),
        "zset" => Some(conn.zcard::<_, usize>(&key).map_err(|e| e.to_string())?),
        "hash" => Some(conn.hlen::<_, usize>(&key).map_err(|e| e.to_string())?),
        _ => None,
    };

    Ok(RedisKey {
        name: key,
        key_type,
        ttl,
        size,
    })
}

#[tauri::command]
pub async fn get_value(
    connection_id: String,
    key: String,
    state: State<'_, AppState>,
) -> Result<RedisValue, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    let key_type: String = conn.key_type(&key).map_err(|e| e.to_string())?;

    let value = match key_type.as_str() {
        "string" => {
            let val: String = conn.get(&key).map_err(|e| e.to_string())?;
            val
        }
        "list" => {
            let val: Vec<String> = conn.lrange(&key, 0, -1).map_err(|e| e.to_string())?;
            serde_json::to_string_pretty(&val).unwrap()
        }
        "set" => {
            let val: Vec<String> = conn.smembers(&key).map_err(|e| e.to_string())?;
            serde_json::to_string_pretty(&val).unwrap()
        }
        "zset" => {
            let val: Vec<(String, f64)> = conn
                .zrange_withscores(&key, 0, -1)
                .map_err(|e| e.to_string())?;
            serde_json::to_string_pretty(&val).unwrap()
        }
        "hash" => {
            let val: std::collections::HashMap<String, String> =
                conn.hgetall(&key).map_err(|e| e.to_string())?;
            serde_json::to_string_pretty(&val).unwrap()
        }
        "stream" => {
            // Use XRANGE to get all stream entries
            let result: redis::Value = redis::cmd("XRANGE")
                .arg(&key)
                .arg("-")
                .arg("+")
                .query(&mut conn)
                .map_err(|e| e.to_string())?;

            // Format the stream data as JSON
            format!("{:?}", result)
        }
        _ => String::from("Unsupported type"),
    };

    Ok(RedisValue { value, key_type })
}

#[tauri::command]
pub async fn set_value(
    connection_id: String,
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    conn.set::<_, _, ()>(&key, value)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_key(
    connection_id: String,
    key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    conn.del::<_, ()>(&key).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn set_ttl(
    connection_id: String,
    key: String,
    ttl: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    if ttl > 0 {
        conn.expire::<_, ()>(&key, ttl).map_err(|e| e.to_string())?;
    } else {
        conn.persist::<_, ()>(&key).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn execute_command(
    connection_id: String,
    command: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    let parts: Vec<&str> = command.trim().split_whitespace().collect();
    if parts.is_empty() {
        return Err("Empty command".to_string());
    }

    let result: redis::RedisResult<redis::Value> =
        redis::cmd(parts[0]).arg(&parts[1..]).query(&mut conn);

    match result {
        Ok(value) => Ok(format!("{:?}", value)),
        Err(e) => Err(e.to_string()),
    }
}

// Connection Management Commands

#[tauri::command]
pub async fn save_connection(
    connection: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let store = state.connection_store.lock().unwrap();

    // Save password to keychain if provided
    if let Some(ref password) = connection.password {
        state
            .password_store
            .save_password(&connection.id, password)
            .map_err(|e| format!("Failed to save password: {}", e))?;
    }

    // Save connection (without password) to disk
    let stored_conn = StoredConnection {
        id: connection.id,
        name: connection.name,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: None, // Never store password in JSON
        database: connection.database,
        use_tls: connection.use_tls,
    };

    store
        .add_connection(stored_conn)
        .map_err(|e| format!("Failed to save connection: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_connections(state: State<'_, AppState>) -> Result<Vec<StoredConnection>, String> {
    let store = state.connection_store.lock().unwrap();

    store
        .load_connections()
        .map_err(|e| format!("Failed to load connections: {}", e))
}

#[tauri::command]
pub async fn delete_saved_connection(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let store = state.connection_store.lock().unwrap();

    // Delete password from keychain
    let _ = state.password_store.delete_password(&connection_id);

    store
        .remove_connection(&connection_id)
        .map_err(|e| format!("Failed to delete connection: {}", e))
}

#[tauri::command]
pub async fn get_connection_password(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    state
        .password_store
        .get_password(&connection_id)
        .map_err(|e| format!("Failed to get password: {}", e))
}

#[tauri::command]
pub async fn test_connection(config: ConnectionConfig) -> Result<ConnectionStatus, String> {
    // Build connection string
    let protocol = if config.use_tls { "rediss" } else { "redis" };

    let url = if let Some(username) = &config.username {
        if let Some(password) = &config.password {
            format!(
                "{}://{}:{}@{}:{}/{}",
                protocol, username, password, config.host, config.port, config.database
            )
        } else {
            format!(
                "{}://{}@{}:{}/{}",
                protocol, username, config.host, config.port, config.database
            )
        }
    } else if let Some(password) = &config.password {
        format!(
            "{}://:{}@{}:{}/{}",
            protocol, password, config.host, config.port, config.database
        )
    } else {
        format!(
            "{}://{}:{}/{}",
            protocol, config.host, config.port, config.database
        )
    };

    // Try to connect
    let client = redis::Client::open(url).map_err(|e| format!("Invalid connection URL: {}", e))?;

    let mut conn = client
        .get_connection()
        .map_err(|e| format!("Connection failed: {}", e))?;

    // Test with PING command
    redis::cmd("PING")
        .query::<String>(&mut conn)
        .map_err(|e| format!("PING failed: {}", e))?;

    Ok(ConnectionStatus {
        id: config.id,
        connected: true,
        error: None,
    })
}

#[tauri::command]
pub async fn get_key_memory_usage(
    connection_id: String,
    key: String,
    state: State<'_, AppState>,
) -> Result<Option<usize>, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    // Use MEMORY USAGE command to get approximate memory usage in bytes
    let result: redis::RedisResult<Option<usize>> =
        redis::cmd("MEMORY").arg("USAGE").arg(&key).query(&mut conn);

    match result {
        Ok(size) => Ok(size),
        Err(_) => {
            // Fallback: MEMORY USAGE might not be available in older Redis versions
            // Try to estimate based on DEBUG OBJECT (less accurate)
            let debug_result: redis::RedisResult<String> =
                redis::cmd("DEBUG").arg("OBJECT").arg(&key).query(&mut conn);

            match debug_result {
                Ok(debug_info) => {
                    // Parse serializedlength from DEBUG OBJECT output
                    // Format: "Value at:0x... refcount:1 encoding:... serializedlength:123 ..."
                    if let Some(pos) = debug_info.find("serializedlength:") {
                        let size_str = &debug_info[pos + 17..];
                        if let Some(end) = size_str.find(' ') {
                            if let Ok(size) = size_str[..end].parse::<usize>() {
                                return Ok(Some(size));
                            }
                        }
                    }
                    Ok(None)
                }
                Err(_) => Ok(None),
            }
        }
    }
}

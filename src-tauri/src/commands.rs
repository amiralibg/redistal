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
    pub encoding: Option<String>,
    pub refcount: Option<usize>,
    pub memory_usage: Option<usize>,
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
    key_type_filter: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    // Avoid `KEYS` which can block Redis on large datasets.
    // We keep the existing frontend contract (return a Vec<String>) but implement it via SCAN.
    // Removed MAX_KEYS limit - now fetches all matching keys
    const SCAN_COUNT: usize = 1000;

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
            seen.insert(key);
        }

        if next_cursor == 0 {
            break;
        }
        cursor = next_cursor;
    }

    let mut keys: Vec<String> = seen.into_iter().collect();

    // Filter by type if specified
    if let Some(filter_type) = key_type_filter {
        if filter_type != "all" {
            let mut filtered_keys = Vec::new();
            for key in &keys {
                let key_type: String = conn.key_type(key).map_err(|e| e.to_string())?;
                if key_type == filter_type {
                    filtered_keys.push(key.clone());
                }
            }
            keys = filtered_keys;
        }
    }

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

    // Get memory usage
    let memory_usage: Option<usize> = redis::cmd("MEMORY")
        .arg("USAGE")
        .arg(&key)
        .query(&mut conn)
        .ok()
        .and_then(|x| x);

    // Get encoding and refcount from DEBUG OBJECT
    let (encoding, refcount) = match redis::cmd("DEBUG")
        .arg("OBJECT")
        .arg(&key)
        .query::<String>(&mut conn)
    {
        Ok(debug_info) => {
            // Parse: "Value at:0x... refcount:1 encoding:embstr serializedlength:5 ..."
            let encoding = debug_info
                .split_whitespace()
                .find(|s| s.starts_with("encoding:"))
                .and_then(|s| s.strip_prefix("encoding:"))
                .map(|s| s.to_string());

            let refcount = debug_info
                .split_whitespace()
                .find(|s| s.starts_with("refcount:"))
                .and_then(|s| s.strip_prefix("refcount:"))
                .and_then(|s| s.parse::<usize>().ok());

            (encoding, refcount)
        }
        Err(_) => (None, None),
    };

    Ok(RedisKey {
        name: key,
        key_type,
        ttl,
        size,
        encoding,
        refcount,
        memory_usage,
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

// Paginated collection fetch commands

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedListResult {
    pub items: Vec<String>,
    pub total_count: usize,
    pub has_more: bool,
}

#[tauri::command]
pub async fn get_list_range(
    connection_id: String,
    key: String,
    start: i64,
    count: usize,
    state: State<'_, AppState>,
) -> Result<PaginatedListResult, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    let total_count: usize = conn.llen(&key).map_err(|e| e.to_string())?;
    let end = start + count as i64 - 1;

    let items: Vec<String> = conn
        .lrange(&key, start as isize, end as isize)
        .map_err(|e| e.to_string())?;

    Ok(PaginatedListResult {
        items,
        total_count,
        has_more: (start + count as i64) < total_count as i64,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedSetResult {
    pub members: Vec<String>,
    pub cursor: u64,
    pub has_more: bool,
}

#[tauri::command]
pub async fn get_set_members(
    connection_id: String,
    key: String,
    cursor: u64,
    count: usize,
    state: State<'_, AppState>,
) -> Result<PaginatedSetResult, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    let (next_cursor, members): (u64, Vec<String>) = redis::cmd("SSCAN")
        .arg(&key)
        .arg(cursor)
        .arg("COUNT")
        .arg(count)
        .query(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(PaginatedSetResult {
        members,
        cursor: next_cursor,
        has_more: next_cursor != 0,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedZSetResult {
    pub items: Vec<(String, f64)>,
    pub total_count: usize,
    pub has_more: bool,
}

#[tauri::command]
pub async fn get_zset_range(
    connection_id: String,
    key: String,
    start: i64,
    count: usize,
    state: State<'_, AppState>,
) -> Result<PaginatedZSetResult, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    let total_count: usize = conn.zcard(&key).map_err(|e| e.to_string())?;
    let end = start + count as i64 - 1;

    let items: Vec<(String, f64)> = conn
        .zrange_withscores(&key, start as isize, end as isize)
        .map_err(|e| e.to_string())?;

    Ok(PaginatedZSetResult {
        items,
        total_count,
        has_more: (start + count as i64) < total_count as i64,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedHashResult {
    pub fields: std::collections::HashMap<String, String>,
    pub cursor: u64,
    pub has_more: bool,
}

#[tauri::command]
pub async fn get_hash_fields(
    connection_id: String,
    key: String,
    cursor: u64,
    count: usize,
    state: State<'_, AppState>,
) -> Result<PaginatedHashResult, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    // HSCAN returns cursor and array of [field, value, field, value, ...]
    let result: redis::Value = redis::cmd("HSCAN")
        .arg(&key)
        .arg(cursor)
        .arg("COUNT")
        .arg(count)
        .query(&mut conn)
        .map_err(|e| e.to_string())?;

    match result {
        redis::Value::Array(ref bulk) if bulk.len() == 2 => {
            let next_cursor = match &bulk[0] {
                redis::Value::BulkString(ref bytes) => {
                    String::from_utf8_lossy(bytes).parse::<u64>().unwrap_or(0)
                }
                _ => 0,
            };

            let mut fields = std::collections::HashMap::new();

            if let redis::Value::Array(ref items) = bulk[1] {
                let mut i = 0;
                while i < items.len() {
                    if i + 1 < items.len() {
                        let field = match &items[i] {
                            redis::Value::BulkString(ref bytes) => {
                                String::from_utf8_lossy(bytes).to_string()
                            }
                            _ => continue,
                        };
                        let value = match &items[i + 1] {
                            redis::Value::BulkString(ref bytes) => {
                                String::from_utf8_lossy(bytes).to_string()
                            }
                            _ => continue,
                        };
                        fields.insert(field, value);
                    }
                    i += 2;
                }
            }

            Ok(PaginatedHashResult {
                fields,
                cursor: next_cursor,
                has_more: next_cursor != 0,
            })
        }
        _ => Err("Unexpected response format from HSCAN".to_string()),
    }
}

// Collection editing commands

// Hash operations
#[tauri::command]
pub async fn hash_set_field(
    connection_id: String,
    key: String,
    field: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    conn.hset::<_, _, _, ()>(&key, &field, &value)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn hash_delete_field(
    connection_id: String,
    key: String,
    field: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    conn.hdel::<_, _, ()>(&key, &field)
        .map_err(|e| e.to_string())?;

    Ok(())
}

// List operations
#[tauri::command]
pub async fn list_push(
    connection_id: String,
    key: String,
    value: String,
    side: String, // "left" or "right"
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    match side.as_str() {
        "left" => conn
            .lpush::<_, _, ()>(&key, &value)
            .map_err(|e| e.to_string())?,
        "right" => conn
            .rpush::<_, _, ()>(&key, &value)
            .map_err(|e| e.to_string())?,
        _ => return Err("Invalid side: must be 'left' or 'right'".to_string()),
    }

    Ok(())
}

#[tauri::command]
pub async fn list_pop(
    connection_id: String,
    key: String,
    side: String, // "left" or "right"
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    let result = match side.as_str() {
        "left" => conn
            .lpop::<_, Option<String>>(&key, None)
            .map_err(|e| e.to_string())?,
        "right" => conn
            .rpop::<_, Option<String>>(&key, None)
            .map_err(|e| e.to_string())?,
        _ => return Err("Invalid side: must be 'left' or 'right'".to_string()),
    };

    Ok(result)
}

#[tauri::command]
pub async fn list_set_index(
    connection_id: String,
    key: String,
    index: i64,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    conn.lset::<_, _, ()>(&key, index as isize, &value)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn list_remove(
    connection_id: String,
    key: String,
    count: i64,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    conn.lrem::<_, _, ()>(&key, count as isize, &value)
        .map_err(|e| e.to_string())?;

    Ok(())
}

// Set operations
#[tauri::command]
pub async fn set_add_member(
    connection_id: String,
    key: String,
    member: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    conn.sadd::<_, _, ()>(&key, &member)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn set_remove_member(
    connection_id: String,
    key: String,
    member: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    conn.srem::<_, _, ()>(&key, &member)
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ZSet operations
#[tauri::command]
pub async fn zset_add_member(
    connection_id: String,
    key: String,
    member: String,
    score: f64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    conn.zadd::<_, _, _, ()>(&key, &member, score)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn zset_remove_member(
    connection_id: String,
    key: String,
    member: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    conn.zrem::<_, _, ()>(&key, &member)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn zset_increment_score(
    connection_id: String,
    key: String,
    member: String,
    increment: f64,
    state: State<'_, AppState>,
) -> Result<f64, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    let new_score: f64 = conn
        .zincr(&key, &member, increment)
        .map_err(|e| e.to_string())?;

    Ok(new_score)
}

// Stream operations
#[derive(Debug, Serialize, Deserialize)]
pub struct StreamEntry {
    pub id: String,
    pub fields: std::collections::HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StreamRangeResult {
    pub entries: Vec<StreamEntry>,
    pub count: usize,
}

#[tauri::command]
pub async fn stream_add_entry(
    connection_id: String,
    key: String,
    fields: std::collections::HashMap<String, String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    // Build XADD command with * for auto-generated ID
    let mut cmd = redis::cmd("XADD");
    cmd.arg(&key).arg("*");

    // Add all field-value pairs
    for (field, value) in fields.iter() {
        cmd.arg(field).arg(value);
    }

    let entry_id: String = cmd.query(&mut conn).map_err(|e| e.to_string())?;

    Ok(entry_id)
}

#[tauri::command]
pub async fn stream_delete_entry(
    connection_id: String,
    key: String,
    entry_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    redis::cmd("XDEL")
        .arg(&key)
        .arg(&entry_id)
        .query::<()>(&mut conn)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn stream_get_range(
    connection_id: String,
    key: String,
    start: String,
    end: String,
    count: Option<usize>,
    state: State<'_, AppState>,
) -> Result<StreamRangeResult, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    let mut cmd = redis::cmd("XRANGE");
    cmd.arg(&key).arg(&start).arg(&end);

    if let Some(c) = count {
        cmd.arg("COUNT").arg(c);
    }

    let result: redis::Value = cmd.query(&mut conn).map_err(|e| e.to_string())?;

    let entries = parse_stream_entries(result)?;

    Ok(StreamRangeResult {
        count: entries.len(),
        entries,
    })
}

#[tauri::command]
pub async fn stream_trim(
    connection_id: String,
    key: String,
    strategy: String, // "MAXLEN" or "MINID"
    threshold: String,
    approximate: bool,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let manager = state.redis_manager.lock().unwrap();

    let mut conn = manager
        .get_connection(&connection_id)
        .ok_or("Connection not found")?;

    let mut cmd = redis::cmd("XTRIM");
    cmd.arg(&key);

    if strategy == "MAXLEN" {
        cmd.arg("MAXLEN");
    } else if strategy == "MINID" {
        cmd.arg("MINID");
    } else {
        return Err("Invalid strategy: must be 'MAXLEN' or 'MINID'".to_string());
    }

    if approximate {
        cmd.arg("~");
    }

    cmd.arg(&threshold);

    let removed: usize = cmd.query(&mut conn).map_err(|e| e.to_string())?;

    Ok(removed)
}

// Helper function to parse XRANGE response
fn parse_stream_entries(value: redis::Value) -> Result<Vec<StreamEntry>, String> {
    let mut entries = Vec::new();

    if let redis::Value::Array(items) = value {
        for item in items {
            if let redis::Value::Array(entry_parts) = item {
                if entry_parts.len() >= 2 {
                    // First element is the entry ID
                    let id = match &entry_parts[0] {
                        redis::Value::BulkString(bytes) => {
                            String::from_utf8_lossy(bytes).to_string()
                        }
                        _ => continue,
                    };

                    // Second element is an array of field-value pairs
                    let mut fields = std::collections::HashMap::new();
                    if let redis::Value::Array(field_values) = &entry_parts[1] {
                        let mut i = 0;
                        while i < field_values.len() {
                            if i + 1 < field_values.len() {
                                let field = match &field_values[i] {
                                    redis::Value::BulkString(bytes) => {
                                        String::from_utf8_lossy(bytes).to_string()
                                    }
                                    _ => {
                                        i += 2;
                                        continue;
                                    }
                                };
                                let value = match &field_values[i + 1] {
                                    redis::Value::BulkString(bytes) => {
                                        String::from_utf8_lossy(bytes).to_string()
                                    }
                                    _ => {
                                        i += 2;
                                        continue;
                                    }
                                };
                                fields.insert(field, value);
                            }
                            i += 2;
                        }
                    }

                    entries.push(StreamEntry { id, fields });
                }
            }
        }
    }

    Ok(entries)
}

use crate::redis_client::{ConnectionConfig, ConnectionStatus, RedisConnectionManager};
use redis::Commands;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub redis_manager: Mutex<RedisConnectionManager>,
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
            let val: Vec<(String, f64)> = conn.zrange_withscores(&key, 0, -1).map_err(|e| e.to_string())?;
            serde_json::to_string_pretty(&val).unwrap()
        }
        "hash" => {
            let val: std::collections::HashMap<String, String> = conn.hgetall(&key).map_err(|e| e.to_string())?;
            serde_json::to_string_pretty(&val).unwrap()
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

    let result: redis::RedisResult<redis::Value> = redis::cmd(parts[0])
        .arg(&parts[1..])
        .query(&mut conn);

    match result {
        Ok(value) => Ok(format!("{:?}", value)),
        Err(e) => Err(e.to_string()),
    }
}

mod commands;
mod redis_client;

use commands::AppState;
use redis_client::RedisConnectionManager;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            redis_manager: Mutex::new(RedisConnectionManager::new()),
        })
        .invoke_handler(tauri::generate_handler![
            commands::connect_to_redis,
            commands::disconnect_from_redis,
            commands::get_keys,
            commands::get_key_info,
            commands::get_value,
            commands::set_value,
            commands::delete_key,
            commands::set_ttl,
            commands::execute_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

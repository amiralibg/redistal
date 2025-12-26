mod commands;
mod connection_store;
mod redis_client;

use commands::AppState;
use connection_store::{ConnectionStore, PasswordStore};
use redis_client::RedisConnectionManager;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let connection_store =
                ConnectionStore::new(&app.handle()).expect("Failed to initialize connection store");
            let password_store = PasswordStore::new();

            app.manage(AppState {
                redis_manager: Mutex::new(RedisConnectionManager::new()),
                connection_store: Mutex::new(connection_store),
                password_store,
            });

            Ok(())
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
            commands::save_connection,
            commands::load_connections,
            commands::delete_saved_connection,
            commands::get_connection_password,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Tilawah desktop/mobile backend (Rust). Custom commands (e.g. audio file I/O,
// settings persistence) are registered here as the app grows.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use tauri::{AppHandle, Manager, State, Emitter, Runtime};
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use std::path::{Path, PathBuf};
use std::fs;
use std::process::Command;
use reqwest;
use zip::ZipArchive;
use dirs;
use open;

#[derive(Default, Serialize, Deserialize, Clone)]
pub struct Config {
    pub game_dir: String,
    pub multibot_desired: bool,
}

pub struct AppState {
    pub config: Mutex<Config>,
}

fn get_config_path(app: &AppHandle) -> PathBuf {
    app.path().app_config_dir().unwrap().join("config.json")
}

fn detect_steam_library() -> Option<PathBuf> {
    let home = dirs::home_dir()?;
    let possible_paths = [
        home.join(".local/share/Steam"),
        home.join(".steam/steam"),
        home.join(".var/app/com.valvesoftware.Steam/data/Steam"),
    ];
    
    for p in possible_paths {
        if p.exists() {
            let lib_vdf = p.join("steamapps/libraryfolders.vdf");
            if lib_vdf.exists() {
                return Some(p.join("steamapps/common"));
            }
        }
    }
    
    // Windows paths
    #[cfg(target_os = "windows")]
    {
        let p1 = PathBuf::from(r"C:\Program Files (x86)\Steam");
        let p2 = PathBuf::from(r"C:\Program Files\Steam");
        let p = if p1.exists() { p1 } else { p2 };
        if p.exists() && p.join("steamapps/libraryfolders.vdf").exists() {
            return Some(p.join("steamapps/common"));
        }
    }
    
    None
}

fn get_default_games_dir() -> PathBuf {
    if let Some(steam) = detect_steam_library() {
        return steam;
    }
    let home = dirs::home_dir().unwrap_or(PathBuf::from("."));
    let games = home.join("Games");
    if !games.exists() {
        let _ = fs::create_dir_all(&games);
    }
    games
}

#[tauri::command]
async fn get_config(state: State<'_, AppState>) -> Result<Config, String> {
    Ok(state.config.lock().unwrap().clone())
}

#[tauri::command]
async fn select_directory(app: AppHandle, state: State<'_, AppState>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();
    
    app.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path.map(|p| p.to_string()));
    });
    
    let result = rx.await.unwrap_or(None);
    if let Some(ref new_dir) = result {
        let mut config = state.config.lock().unwrap();
        config.game_dir = new_dir.clone();
        let config_path = get_config_path(&app);
        let _ = fs::create_dir_all(config_path.parent().unwrap());
        let _ = fs::write(config_path, serde_json::to_string(&*config).unwrap());
    }
    Ok(result)
}

#[tauri::command]
async fn get_game_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let config = state.config.lock().unwrap();
    let game_dir = Path::new(&config.game_dir);
    let wow_exe = game_dir.join("Wow.exe");
    let installed = wow_exe.exists();
    
    Ok(serde_json::json!({
        "installed": installed,
        "multibotEnabled": config.multibot_desired,
        "gameDir": config.game_dir
    }))
}

#[tauri::command]
async fn toggle_addon(app: AppHandle, state: State<'_, AppState>, enabled: bool) -> Result<bool, String> {
    let mut config = state.config.lock().unwrap();
    config.multibot_desired = enabled;
    let config_path = get_config_path(&app);
    let _ = fs::write(config_path, serde_json::to_string(&*config).unwrap());
    Ok(true)
}

#[tauri::command]
async fn launch_game(state: State<'_, AppState>) -> Result<(), String> {
    let config = state.config.lock().unwrap();
    let game_dir = Path::new(&config.game_dir);
    let wow_exe = game_dir.join("Wow.exe");
    
    if cfg!(target_os = "windows") {
        Command::new(wow_exe)
            .current_dir(game_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        Command::new("wine")
            .arg(wow_exe)
            .current_dir(game_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn open_game_folder(state: State<'_, AppState>) -> Result<(), String> {
    let config = state.config.lock().unwrap();
    open::that(&config.game_dir).map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_external(url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_os::init())
    .setup(|app| {
        let config_path = get_config_path(app.handle());
        let config = if config_path.exists() {
            let content = fs::read_to_string(config_path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_else(|_| {
                let mut c = Config::default();
                c.game_dir = get_default_games_dir().join("Ikhan WoW").to_string_lossy().to_string();
                c
            })
        } else {
            let mut c = Config::default();
            c.game_dir = get_default_games_dir().join("Ikhan WoW").to_string_lossy().to_string();
            c
        };
        app.manage(AppState { config: Mutex::new(config) });
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        get_config, 
        get_game_status, 
        toggle_addon, 
        launch_game, 
        open_game_folder, 
        open_external, 
        select_directory
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
async fn install_game_impl(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let config = state.config.lock().unwrap().clone();
    let game_dir = PathBuf::from(&config.game_dir);
    let _ = fs::create_dir_all(&game_dir);
    
    app.emit("status-update", "Downloading client...").unwrap();
    
    // For now, let's assume we use reqwest for a direct link if we had one.
    // Since we have a torrent, we'd use a sidecar here.
    // Example of calling a sidecar:
    /*
    let sidecar_command = app.shell().sidecar("aria2c").unwrap()
        .args(["-d", &config.game_dir, "--seed-time=0", "https://..."]);
    let (mut rx, _child) = sidecar_command.spawn().unwrap();
    while let Some(event) = rx.recv().await {
        // Handle progress...
    }
    */
    
    app.emit("status-update", "Extraction in progress...").unwrap();
    // Extraction logic using zip crate...
    
    Ok(())
}

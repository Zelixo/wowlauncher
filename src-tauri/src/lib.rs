use tauri::{AppHandle, Manager, State, Emitter};
use tauri_plugin_shell::ShellExt;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use std::path::{Path, PathBuf};
use std::fs;
use std::process::Command;
use zip::ZipArchive;
use dirs;
use open;
use regex::Regex;
use reqwest;

const TARGET_REALMLIST: &str = "wow.zelixo.net";
const MULTIBOT_URL: &str = "https://github.com/Macx-Lio/MultiBot/archive/refs/heads/master.zip";

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

fn get_wow_exe_path(game_dir: &Path) -> PathBuf {
    let direct = game_dir.join("Wow.exe");
    if direct.exists() {
        return direct;
    }
    
    // Check ChromieCraft subdirectory
    let chromie = game_dir.join("ChromieCraft_3.3.5a").join("Wow.exe");
    if chromie.exists() {
        return chromie;
    }
    
    direct
}

fn update_realmlist(game_dir: &Path) -> Result<(), String> {
    let possible_paths = [
        game_dir.join("Data/enUS/realmlist.wtf"),
        game_dir.join("Data/enGB/realmlist.wtf"),
        game_dir.join("realmlist.wtf"),
    ];

    for p in possible_paths {
        if p.exists() || p.parent().map(|parent| parent.exists()).unwrap_or(false) {
            let content = format!("set realmlist {}\n", TARGET_REALMLIST);
            fs::write(p, content).map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    Err("Could not find realmlist.wtf location".to_string())
}

async fn manage_multibot(app: &AppHandle, game_dir: &Path, enabled: bool) -> Result<(), String> {
    let addons_dir = game_dir.join("Interface/AddOns");
    let multibot_dir = addons_dir.join("MultiBot");
    let temp_multibot_dir = addons_dir.join("MultiBot-main");

    if enabled {
        if !multibot_dir.exists() {
            let _ = app.emit("status-update", "Downloading MultiBot addon...");
            let response = reqwest::get(MULTIBOT_URL).await.map_err(|e| e.to_string())?;
            let bytes = response.bytes().await.map_err(|e| e.to_string())?;
            
            let reader = std::io::Cursor::new(bytes);
            let mut archive = ZipArchive::new(reader).map_err(|e| e.to_string())?;
            
            for i in 0..archive.len() {
                let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
                let outpath = match file.enclosed_name() {
                    Some(path) => addons_dir.join(path),
                    None => continue,
                };

                if (*file.name()).ends_with('/') {
                    fs::create_dir_all(&outpath).unwrap();
                } else {
                    if let Some(p) = outpath.parent() {
                        if !p.exists() {
                            fs::create_dir_all(&p).unwrap();
                        }
                    }
                    let mut outfile = fs::File::create(&outpath).unwrap();
                    std::io::copy(&mut file, &mut outfile).unwrap();
                }
            }

            // Rename MultiBot-main to MultiBot if needed
            if temp_multibot_dir.exists() {
                let _ = fs::rename(&temp_multibot_dir, &multibot_dir);
            }
        }
    } else {
        if multibot_dir.exists() {
            let _ = app.emit("status-update", "Removing MultiBot addon...");
            fs::remove_dir_all(multibot_dir).map_err(|e| e.to_string())?;
        }
        if temp_multibot_dir.exists() {
            let _ = fs::remove_dir_all(temp_multibot_dir);
        }
    }
    Ok(())
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
    let wow_exe = get_wow_exe_path(game_dir);
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
async fn launch_game(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let (game_dir_root_str, multibot_enabled) = {
        let config = state.config.lock().unwrap();
        (config.game_dir.clone(), config.multibot_desired)
    };
    
    let game_dir_root = Path::new(&game_dir_root_str);
    let wow_exe = get_wow_exe_path(game_dir_root);
    let game_dir = wow_exe.parent().unwrap_or(game_dir_root).to_path_buf();
    
    if !wow_exe.exists() {
        return Err(format!("Wow.exe not found at {:?}", wow_exe));
    }

    // Apply configurations before launch
    let _ = update_realmlist(&game_dir);
    let _ = manage_multibot(&app, &game_dir, multibot_enabled).await;

    if cfg!(target_os = "windows") {
        Command::new(wow_exe.clone())
            .current_dir(game_dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        Command::new("wine")
            .arg(wow_exe.clone())
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

#[tauri::command]
async fn install_game(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    install_game_impl(app, state).await
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
        select_directory,
        install_game
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[derive(Serialize, Clone)]
struct DownloadProgress {
    percent: f64,
    downloaded: u64,
    total: u64,
    speed: u64,
}

fn parse_size(size_str: &str) -> u64 {
    let re = Regex::new(r"([\d\.]+)([A-Za-z]+)").unwrap();
    if let Some(cap) = re.captures(size_str) {
        let val: f64 = cap[1].parse().unwrap_or(0.0);
        let unit = &cap[2];
        let factor = match unit {
            "KiB" | "KB" => 1024,
            "MiB" | "MB" => 1024 * 1024,
            "GiB" | "GB" => 1024 * 1024 * 1024,
            _ => 1,
        };
        return (val * factor as f64) as u64;
    }
    0
}

async fn install_game_impl(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let (game_dir_str, multibot_enabled) = {
        let config = state.config.lock().unwrap();
        (config.game_dir.clone(), config.multibot_desired)
    };
    let game_dir = PathBuf::from(&game_dir_str);
    let _ = fs::create_dir_all(&game_dir);
    
    let _ = app.emit("status-update", "Downloading client...");

    let magnet = "magnet:?xt=urn:btih:2ba2833baf733ce0a16040d43ed09491f2bf2ab2&dn=ChromieCraft_3.3.5a.zip&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.uw0.xyz%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zerobytes.xyz%3A1337%2Fannounce";
    
    let (mut rx, _child) = app.shell().sidecar("aria2c").unwrap()
        .args([
            "--dir", &game_dir_str,
            "--seed-time=0",
            "--follow-torrent=mem",
            "--summary-interval=1",
            "--console-log-level=notice",
            magnet
        ])
        .spawn()
        .map_err(|e| e.to_string())?;

    // Improved Regex for aria2c output
    let progress_re = Regex::new(r"\[#\w+\s+([\d\.\w]+)/([\d\.\w]+)\s*\(([\d\.]+)%\).*?DL:([\d\.\w]+)").unwrap();

    while let Some(event) = rx.recv().await {
        use tauri_plugin_shell::process::CommandEvent;
        let line_bytes = match event {
            CommandEvent::Stdout(line) => line,
            CommandEvent::Stderr(line) => line,
            _ => continue,
        };
        
        let line_str = String::from_utf8_lossy(&line_bytes);
        for chunk in line_str.split('\r') {
            if let Some(cap) = progress_re.captures(chunk) {
                let downloaded = parse_size(&cap[1]);
                let total = parse_size(&cap[2]);
                let percent: f64 = cap[3].parse().unwrap_or(0.0);
                let speed = parse_size(&cap[4]);

                let _ = app.emit("download-progress", DownloadProgress {
                    percent,
                    downloaded,
                    total,
                    speed,
                });
            }
        }
    }
    
    let _ = app.emit("status-update", "Extraction in progress...");
    let zip_path = game_dir.join("ChromieCraft_3.3.5a.zip");
    if zip_path.exists() {
        let file = fs::File::open(&zip_path).map_err(|e| e.to_string())?;
        let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
        let total_files = archive.len();
        
        for i in 0..total_files {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            
            // Emit progress
            let percent = (i as f64 / total_files as f64) * 100.0;
            let _ = app.emit("download-progress", DownloadProgress {
                percent,
                downloaded: i as u64, // Using file index as proxy for progress details
                total: total_files as u64,
                speed: 0,
            });

            let enclosed = file.enclosed_name().ok_or("Invalid path in zip")?;
            
            // Flatten if it's the root directory ChromieCraft_3.3.5a
            let mut relative_path = PathBuf::from(enclosed);
            if relative_path.starts_with("ChromieCraft_3.3.5a") {
                relative_path = match relative_path.strip_prefix("ChromieCraft_3.3.5a") {
                    Ok(p) => p.to_path_buf(),
                    Err(_) => relative_path,
                };
            }
            
            if relative_path.as_os_str().is_empty() {
                continue;
            }

            let outpath = game_dir.join(relative_path);

            if (*file.name()).ends_with('/') {
                fs::create_dir_all(&outpath).unwrap();
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(&p).unwrap();
                    }
                }
                let mut outfile = fs::File::create(&outpath).unwrap();
                std::io::copy(&mut file, &mut outfile).unwrap();
            }
        }
        let _ = fs::remove_file(zip_path);
    }

    // Post-install setup
    let final_wow_exe = get_wow_exe_path(&game_dir);
    let final_game_dir = final_wow_exe.parent().unwrap_or(&game_dir);
    let _ = update_realmlist(final_game_dir);
    let _ = manage_multibot(&app, final_game_dir, multibot_enabled).await;
    
    let _ = app.emit("status-update", "The ritual is complete!");
    Ok(())
}

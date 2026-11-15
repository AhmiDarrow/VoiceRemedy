#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

const SOURCE_URL: &str = "https://github.com/AhmiDarrow/VoiceRemedy";

#[tauri::command]
fn open_source_page() -> Result<(), String> {
    open_url(SOURCE_URL).map_err(|err| err.to_string())
}

fn open_url(url: &str) -> std::io::Result<()> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW keeps the helper from flashing a console. The browser is the intended window.
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("rundll32.exe")
            .args(["url.dll,FileProtocolHandler", url])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map(|_| ())
    }
    #[cfg(not(windows))]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .or_else(|_| std::process::Command::new("open").arg(url).spawn())
            .map(|_| ())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_source_page])
        .run(tauri::generate_context!())
        .expect("Could not open VoiceRemedy");
}

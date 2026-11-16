use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager, State, async_runtime};
use tauri_plugin_dialog::DialogExt;

use crate::credit::media_of;
use crate::failure::{Failure, Outcome};
use crate::file::opened_file;
use crate::protocol::{McpAccess, Opened, Site};
use crate::source::source_of;

const NOT_MEDIA: &str = "開けるリンクではありません";
const NO_FILES: &str = "このアプリはファイルを開けません";
const MISSING_FILE: &str = "ファイルが見つかりません";
const MEDIA_FILES: &str = "動画と音声";
const MEDIA_EXTENSIONS: [&str; 11] = [
    "mp4", "m4v", "mov", "webm", "mkv", "mp3", "m4a", "aac", "wav", "flac", "ogg",
];

pub struct MediaNotes {
    pub client: reqwest::Client,
    pub sites: &'static [Site],
    pub mcp: McpAccess,
}

pub struct Setting<'a> {
    pub name: &'static str,
    pub version: &'static str,
    pub data: &'a Path,
    pub sites: &'static [Site],
    pub port: u16,
}

pub fn media_notes(setting: &Setting<'_>) -> Outcome<MediaNotes> {
    Ok(MediaNotes {
        client: reqwest::Client::builder()
            .user_agent(format!("{}/{}", setting.name, setting.version))
            .build()?,
        sites: setting.sites,
        mcp: McpAccess {
            url: local_mcp::url(setting.port),
            token: local_mcp::token(setting.data)?,
        },
    })
}

type Answer<T> = Result<T, Failure>;

#[tauri::command]
#[specta::specta]
pub async fn open_link(notes: State<'_, MediaNotes>, link: String) -> Answer<Opened> {
    let source = source_of(&link)
        .filter(|source| notes.sites.contains(&source.site))
        .ok_or_else(|| Failure::new(NOT_MEDIA))?;
    Ok(Opened {
        media: media_of(&notes.client, source).await,
        location: link.trim().to_owned(),
    })
}

fn readable(path: &Path) -> Outcome<()> {
    if path.is_file() {
        Ok(())
    } else {
        Err(Failure::new(MISSING_FILE))
    }
}

fn failed(failure: impl std::fmt::Display) -> Failure {
    Failure::new(failure.to_string())
}

async fn opened_at(app: &AppHandle, sites: &[Site], path: PathBuf) -> Outcome<Opened> {
    if !sites.contains(&Site::File) {
        return Err(Failure::new(NO_FILES));
    }
    readable(&path)?;
    let opened = async_runtime::spawn_blocking(move || opened_file(&path))
        .await
        .map_err(failed)??;
    app.asset_protocol_scope()
        .allow_file(&opened.location)
        .map_err(failed)?;
    Ok(opened)
}

#[tauri::command]
#[specta::specta]
pub async fn open_file(
    app: AppHandle,
    notes: State<'_, MediaNotes>,
    path: String,
) -> Answer<Opened> {
    opened_at(&app, notes.sites, PathBuf::from(path)).await
}

#[tauri::command]
#[specta::specta]
pub async fn choose_file(app: AppHandle, notes: State<'_, MediaNotes>) -> Answer<Option<Opened>> {
    let asking = app.clone();
    let chosen = async_runtime::spawn_blocking(move || {
        asking
            .dialog()
            .file()
            .add_filter(MEDIA_FILES, &MEDIA_EXTENSIONS)
            .blocking_pick_file()
    })
    .await
    .map_err(failed)?;
    let Some(chosen) = chosen else {
        return Ok(None);
    };
    let path = chosen.into_path().map_err(failed)?;
    Ok(Some(opened_at(&app, notes.sites, path).await?))
}

#[tauri::command]
#[specta::specta]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri hands managed state to commands by value"
)]
pub fn mcp_access(notes: State<'_, MediaNotes>) -> Answer<McpAccess> {
    Ok(notes.mcp.clone())
}

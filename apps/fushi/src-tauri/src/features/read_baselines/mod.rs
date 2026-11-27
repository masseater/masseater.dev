use std::env;
use std::fs;
use std::path::PathBuf;

use crate::shared::{Answer, Failure};

const EXTENSION: &str = "json";

fn table_dir() -> Option<PathBuf> {
    let base = env::var_os("XDG_CACHE_HOME")
        .map(PathBuf::from)
        .or_else(|| {
            env::var_os("HOME")
                .or_else(|| env::var_os("USERPROFILE"))
                .map(|home| PathBuf::from(home).join(".cache"))
        })?;
    Some(base.join("i68-presets").join("chordonomicon"))
}

fn is_name(name: &str) -> bool {
    !name.is_empty()
        && name
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
}

#[tauri::command]
#[specta::specta]
pub async fn list_baselines() -> Answer<Vec<String>> {
    let Some(dir) = table_dir().filter(|dir| dir.is_dir()) else {
        return Ok(Vec::new());
    };
    let mut names: Vec<String> = fs::read_dir(dir)?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.extension()
                .is_some_and(|extension| extension == EXTENSION)
        })
        .filter_map(|path| {
            path.file_stem()
                .and_then(|stem| stem.to_str())
                .map(str::to_owned)
        })
        .collect();
    names.sort();
    Ok(names)
}

#[tauri::command]
#[specta::specta]
pub async fn read_baseline(name: String) -> Answer<String> {
    if !is_name(&name) {
        return Err(Failure {
            message: format!("{name} is not a baseline name"),
        });
    }
    let dir = table_dir().ok_or_else(|| Failure {
        message: "no cache directory".to_owned(),
    })?;
    Ok(fs::read_to_string(dir.join(format!("{name}.{EXTENSION}")))?)
}

#[cfg(test)]
mod tests {
    use super::is_name;

    #[test]
    fn only_plain_names_are_read() {
        assert!(is_name("all"));
        assert!(is_name("pop-rock"));
        assert!(!is_name("../secret"));
        assert!(!is_name(""));
    }
}

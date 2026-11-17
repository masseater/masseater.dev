use std::env;
use std::ffi::OsString;
use std::path::{Path, PathBuf};

const HOME_DIRECTORIES: [&str; 2] = [".local/bin", ".claude/local"];
const SYSTEM_DIRECTORIES: [&str; 2] = ["/opt/homebrew/bin", "/usr/local/bin"];

fn executable_name() -> String {
    format!("claude{}", env::consts::EXE_SUFFIX)
}

fn candidates(path: Option<OsString>, home: Option<&Path>) -> Vec<PathBuf> {
    let searched = path.map(|value| env::split_paths(&value).collect::<Vec<_>>());
    let in_home = home.map(|home| HOME_DIRECTORIES.iter().map(|dir| home.join(dir)).collect());
    searched
        .into_iter()
        .chain(in_home)
        .flatten()
        .chain(SYSTEM_DIRECTORIES.iter().map(PathBuf::from))
        .collect()
}

pub fn installed(path: Option<OsString>, home: Option<&Path>) -> Option<PathBuf> {
    let name = executable_name();
    candidates(path, home)
        .into_iter()
        .map(|directory| directory.join(&name))
        .find(|file| file.is_file())
}

#[cfg(test)]
mod tests {
    use super::{executable_name, installed};
    use std::fs;
    use std::path::PathBuf;

    fn scratch(name: &str) -> PathBuf {
        let directory =
            std::env::temp_dir().join(format!("yohaku-claude-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).expect("create scratch directory");
        directory
    }

    #[test]
    fn finds_claude_in_the_home_install_directory() {
        let home = scratch("home");
        let bin = home.join(".local/bin");
        fs::create_dir_all(&bin).expect("create bin");
        fs::write(bin.join(executable_name()), "").expect("write claude");
        assert_eq!(
            installed(None, Some(&home)),
            Some(bin.join(executable_name()))
        );
    }

    #[test]
    fn prefers_claude_on_the_path() {
        let home = scratch("prefer-home");
        let on_path = scratch("prefer-path");
        let bin = home.join(".local/bin");
        fs::create_dir_all(&bin).expect("create bin");
        fs::write(bin.join(executable_name()), "").expect("write claude");
        fs::write(on_path.join(executable_name()), "").expect("write claude");
        assert_eq!(
            installed(Some(on_path.clone().into_os_string()), Some(&home)),
            Some(on_path.join(executable_name()))
        );
    }

    #[test]
    fn ignores_a_directory_named_claude() {
        let home = scratch("directory");
        fs::create_dir_all(home.join(".local/bin").join(executable_name()))
            .expect("create directory");
        let found = installed(None, Some(&home));
        assert_ne!(found, Some(home.join(".local/bin").join(executable_name())));
    }
}

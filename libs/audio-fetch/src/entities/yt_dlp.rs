use std::fmt::Write as _;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

use crate::shared::error::{FetchError, Fetching};

pub const VERSION: &str = "2026.10.26";

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct Build {
    asset: &'static str,
    sha256: &'static str,
    program: &'static str,
}

#[cfg(target_os = "windows")]
const BUILD: Build = Build {
    asset: "yt-dlp_win.zip",
    sha256: "fd51b212cf8380c7a52ee08c0d6be7f3c59b2f2c832eaf7b45acfae6eab57419",
    program: "yt-dlp.exe",
};

#[cfg(target_os = "macos")]
const BUILD: Build = Build {
    asset: "yt-dlp_macos.zip",
    sha256: "20d98fa608998eff87d1d35a6e9fb65e4b874639a6cc89addc19da3becde3ef1",
    program: "yt-dlp_macos",
};

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
const BUILD: Build = Build {
    asset: "yt-dlp_linux.zip",
    sha256: "f34053415136e55073dd64ba5326d161ecc23ce0e98c081d8752867b37809450",
    program: "yt-dlp_linux",
};

fn failure(message: impl Into<String>) -> FetchError {
    FetchError::YtDlp(message.into())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().fold(String::new(), |mut text, byte| {
        let _ = write!(text, "{byte:02x}");
        text
    })
}

fn unpack(archive: Vec<u8>, target: &Path) -> Fetching<()> {
    let staging = target.with_extension("partial");
    if staging.exists() {
        std::fs::remove_dir_all(&staging)?;
    }
    zip::ZipArchive::new(std::io::Cursor::new(archive))
        .and_then(|mut archive| archive.extract(&staging))
        .map_err(|error| failure(error.to_string()))?;
    std::fs::rename(&staging, target)?;
    Ok(())
}

fn program_in(directory: &Path) -> Fetching<PathBuf> {
    let direct = directory.join(BUILD.program);
    if direct.is_file() {
        return Ok(direct);
    }
    std::fs::read_dir(directory)?
        .filter_map(Result::ok)
        .map(|entry| entry.path().join(BUILD.program))
        .find(|path| path.is_file())
        .ok_or_else(|| {
            failure(format!(
                "{} not found in {}",
                BUILD.program,
                directory.display()
            ))
        })
}

#[tracing::instrument(skip(client))]
pub async fn install(client: &reqwest::Client, cache: &Path) -> Fetching<PathBuf> {
    let target = cache.join("yt-dlp").join(VERSION);
    if target.is_dir() {
        return program_in(&target);
    }
    let url = format!(
        "https://github.com/yt-dlp/yt-dlp/releases/download/{VERSION}/{}",
        BUILD.asset
    );
    let archive = client
        .get(&url)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await?
        .to_vec();
    let digest = hex(&Sha256::digest(&archive));
    if digest != BUILD.sha256 {
        return Err(failure(format!(
            "{} has SHA-256 {digest}, expected {}",
            BUILD.asset, BUILD.sha256
        )));
    }
    tokio::fs::create_dir_all(cache.join("yt-dlp")).await?;
    let unpacked = target.clone();
    tokio::task::spawn_blocking(move || unpack(archive, &unpacked))
        .await
        .map_err(|error| failure(error.to_string()))??;
    program_in(&target)
}

pub struct Downloaded {
    pub path: PathBuf,
    pub title: String,
    pub artist: String,
}

pub fn downloaded_from(output: &str) -> Fetching<Downloaded> {
    let lines: Vec<&str> = output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .collect();
    match lines.as_slice() {
        [.., path, title, artist] => Ok(Downloaded {
            path: PathBuf::from(path.trim()),
            title: (*title).to_owned(),
            artist: if *artist == "NA" {
                String::new()
            } else {
                (*artist).to_owned()
            },
        }),
        _ => Err(failure(format!("unexpected output: {output}"))),
    }
}

fn command(program: &Path) -> tokio::process::Command {
    let mut command = tokio::process::Command::new(program);
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);
    command
        .args(["--ignore-config", "--encoding", "utf-8", "--no-playlist"])
        .kill_on_drop(true);
    command
}

async fn printed(command: &mut tokio::process::Command) -> Fetching<String> {
    let output = command.output().await?;
    if !output.status.success() {
        let reason = String::from_utf8_lossy(&output.stderr);
        return Err(failure(format!("{}: {}", output.status, reason.trim())));
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

pub struct Described {
    pub title: String,
    pub artist: String,
}

fn described_from(output: &str) -> Fetching<Described> {
    let lines: Vec<&str> = output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .collect();
    match lines.as_slice() {
        [.., title, artist] => Ok(Described {
            title: (*title).to_owned(),
            artist: if *artist == "NA" {
                String::new()
            } else {
                (*artist).to_owned()
            },
        }),
        _ => Err(failure(format!("unexpected output: {output}"))),
    }
}

fn page(url: &str) -> Fetching<reqwest::Url> {
    reqwest::Url::parse(url)
        .ok()
        .filter(|page| matches!(page.scheme(), "http" | "https"))
        .ok_or_else(|| failure(format!("not an http or https URL: {url}")))
}

fn describing(program: &Path, url: &str) -> Fetching<tokio::process::Command> {
    let page = page(url)?;
    let mut command = command(program);
    command
        .args(["--skip-download", "--print", "title", "--print", "uploader"])
        .args(["--", page.as_str()]);
    Ok(command)
}

#[tracing::instrument(skip(program))]
pub async fn describe(program: &Path, url: &str) -> Fetching<Described> {
    let output = printed(&mut describing(program, url)?).await?;
    described_from(&output)
}

fn downloading(program: &Path, url: &str, directory: &Path) -> Fetching<tokio::process::Command> {
    let page = page(url)?;
    let mut command = command(program);
    command
        .args([
            "--no-progress",
            "--no-mtime",
            "--format",
            "bestaudio/best",
            "--output",
        ])
        .arg(directory.join("source.%(ext)s"))
        .args([
            "--print",
            "after_move:filepath",
            "--print",
            "after_move:title",
            "--print",
            "after_move:uploader",
        ])
        .args(["--", page.as_str()]);
    Ok(command)
}

#[tracing::instrument(skip(program, directory))]
pub async fn download(program: &Path, url: &str, directory: &Path) -> Fetching<Downloaded> {
    let output = printed(&mut downloading(program, url, directory)?).await?;
    downloaded_from(&output)
}

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};

    use super::{described_from, describing, downloaded_from, downloading};

    const PROGRAM: &str = "yt-dlp";
    const PAGE: &str = "https://example.com/watch?v=1";

    fn arguments(command: &tokio::process::Command) -> Vec<&str> {
        command
            .as_std()
            .get_args()
            .filter_map(std::ffi::OsStr::to_str)
            .collect()
    }

    #[test]
    fn the_url_follows_the_end_of_options_and_no_config_file_is_read() {
        let directory = Path::new("/tmp/song");
        let program = Path::new(PROGRAM);
        for command in [
            describing(program, PAGE).unwrap(),
            downloading(program, PAGE, directory).unwrap(),
        ] {
            let arguments = arguments(&command);
            assert!(arguments.contains(&"--ignore-config"));
            assert_eq!(arguments[arguments.len() - 2..], ["--", PAGE]);
        }
    }

    #[test]
    fn only_http_urls_reach_the_command_line() {
        let directory = Path::new("/tmp/song");
        let program = Path::new(PROGRAM);
        for location in [
            "--config-locations=/tmp/evil.conf",
            "-U",
            "file:///etc/passwd",
            "song.mp3",
            "",
        ] {
            assert!(describing(program, location).is_err());
            assert!(downloading(program, location, directory).is_err());
        }
    }

    #[test]
    fn printed_fields_are_read_from_the_last_three_lines() {
        let downloaded =
            downloaded_from("[info] noise\n/tmp/song/source.webm\nSong Title\nNA\n").unwrap();
        assert_eq!(downloaded.path, PathBuf::from("/tmp/song/source.webm"));
        assert_eq!(
            (downloaded.title.as_str(), downloaded.artist.as_str()),
            ("Song Title", "")
        );
        assert!(downloaded_from("only one line\n").is_err());
    }

    #[test]
    fn described_fields_are_read_from_the_last_two_lines() {
        let described = described_from("[info] noise\nメルト\nryo\n").unwrap();
        assert_eq!(
            (described.title.as_str(), described.artist.as_str()),
            ("メルト", "ryo")
        );
        assert!(described_from("only one line\n").is_err());
    }
}

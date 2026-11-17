use std::fmt::Write;
use std::fs;
use std::io;
use std::path::Path;

const TOKEN_FILE: &str = "mcp-token";
const TOKEN_BYTES: usize = 32;

fn hex(bytes: &[u8]) -> String {
    bytes.iter().fold(String::new(), |mut text, byte| {
        let _ = write!(text, "{byte:02x}");
        text
    })
}

fn write_private(file: &Path, text: &str) -> io::Result<()> {
    fs::write(file, text)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(file, fs::Permissions::from_mode(0o600))?;
    }
    Ok(())
}

pub fn token(directory: &Path) -> io::Result<String> {
    let file = directory.join(TOKEN_FILE);
    let stored = fs::read_to_string(&file).unwrap_or_default();
    if !stored.trim().is_empty() {
        return Ok(stored.trim().to_owned());
    }
    let mut bytes = [0_u8; TOKEN_BYTES];
    getrandom::fill(&mut bytes).map_err(io::Error::other)?;
    let token = hex(&bytes);
    fs::create_dir_all(directory)?;
    write_private(&file, &token)?;
    Ok(token)
}

#[cfg(test)]
mod tests {
    use super::token;

    #[test]
    fn keeps_the_token_it_made() {
        let directory = tempfile::tempdir().expect("temporary directory");
        let first = token(directory.path()).expect("first token");
        let second = token(directory.path()).expect("second token");
        assert_eq!(first.len(), 64);
        assert_eq!(first, second);
    }
}

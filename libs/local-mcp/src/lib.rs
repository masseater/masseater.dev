use std::fmt::Write;
use std::fs;
use std::io;
use std::path::Path;
use std::sync::Arc;

use axum::Router;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, StatusCode, header};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};

pub const HOST: &str = "127.0.0.1";
pub const MCP_PATH: &str = "/mcp";
const TOKEN_FILE: &str = "mcp-token";
const TOKEN_BYTES: usize = 32;
const BEARER: &str = "Bearer ";

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

#[must_use]
pub fn url(port: u16) -> String {
    format!("http://{HOST}:{port}{MCP_PATH}")
}

fn presented(headers: &HeaderMap, expected: &str) -> bool {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix(BEARER))
        .is_some_and(|given| {
            constant_time_eq::constant_time_eq(given.as_bytes(), expected.as_bytes())
        })
}

async fn authorized(State(token): State<Arc<String>>, request: Request, next: Next) -> Response {
    if presented(request.headers(), &token) {
        return next.run(request).await;
    }
    StatusCode::UNAUTHORIZED.into_response()
}

pub fn guarded(router: Router, token: String) -> Router {
    router.layer(middleware::from_fn_with_state(Arc::new(token), authorized))
}

#[cfg(test)]
mod tests {
    use axum::http::{HeaderMap, HeaderValue, header};

    use super::{presented, token};

    #[test]
    fn requires_the_bearer_token() {
        let mut headers = HeaderMap::new();
        assert!(!presented(&headers, "secret"));
        headers.insert(
            header::AUTHORIZATION,
            HeaderValue::from_static("Bearer secret"),
        );
        assert!(presented(&headers, "secret"));
        assert!(!presented(&headers, "other"));
    }

    #[test]
    fn keeps_the_token_it_made() {
        let directory = tempfile::tempdir().expect("temporary directory");
        let first = token(directory.path()).expect("first token");
        let second = token(directory.path()).expect("second token");
        assert_eq!(first.len(), 64);
        assert_eq!(first, second);
    }
}

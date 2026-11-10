use std::io::Read;
use std::thread::sleep;
use std::time::Duration;

use ureq::tls::{RootCerts, TlsConfig};

const USER_AGENT: &str = "thumb-mosaic (+https://github.com/masseater/masseater.dev)";
const BODY_LIMIT: u64 = 1 << 30;
const GONE: [u16; 3] = [403, 404, 410];
pub(crate) const TRIES: u32 = 6;
pub(crate) const TIMEOUT: Duration = Duration::from_secs(120);

fn fetch(url: &str, timeout: Duration) -> Result<Vec<u8>, ureq::Error> {
    let agent: ureq::Agent = ureq::Agent::config_builder()
        .timeout_global(Some(timeout))
        .tls_config(
            TlsConfig::builder()
                .root_certs(RootCerts::PlatformVerifier)
                .build(),
        )
        .build()
        .into();
    let mut response = agent.get(url).header("User-Agent", USER_AGENT).call()?;
    let mut body = Vec::new();
    response
        .body_mut()
        .as_reader()
        .take(BODY_LIMIT)
        .read_to_end(&mut body)?;
    Ok(body)
}

pub(crate) fn get_with(url: &str, tries: u32, timeout: Duration) -> Option<Vec<u8>> {
    for attempt in 0..tries {
        match fetch(url, timeout) {
            Ok(body) => return Some(body),
            Err(ureq::Error::StatusCode(code)) if GONE.contains(&code) => return None,
            Err(error) => eprintln!("retry {}/{tries} {url}: {error}", attempt + 1),
        }
        if attempt + 1 < tries {
            sleep(Duration::from_secs(5 << attempt));
        }
    }
    None
}

pub(crate) fn get(url: &str) -> Option<Vec<u8>> {
    get_with(url, TRIES, TIMEOUT)
}

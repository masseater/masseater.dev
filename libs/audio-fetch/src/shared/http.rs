use std::sync::Arc;

use super::error::{Fetching, site_failure};

const BROWSER: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

pub fn client() -> Fetching<reqwest::Client> {
    let mut builder = reqwest::Client::builder()
        .cookie_provider(Arc::new(reqwest::cookie::Jar::default()))
        .gzip(true)
        .pool_max_idle_per_host(16)
        .user_agent(BROWSER);
    if let Some(path) = std::env::var_os("SSL_CERT_FILE") {
        let pem = std::fs::read(path)?;
        for certificate in reqwest::Certificate::from_pem_bundle(&pem)? {
            builder = builder.add_root_certificate(certificate);
        }
    }
    Ok(builder.build()?)
}

pub fn join(base: &str, relative: &str) -> Fetching<String> {
    let base =
        reqwest::Url::parse(base).map_err(|error| site_failure(format!("{base}: {error}")))?;
    let joined = base
        .join(relative)
        .map_err(|error| site_failure(format!("{relative}: {error}")))?;
    Ok(joined.to_string())
}

pub async fn bytes(client: &reqwest::Client, url: &str) -> Fetching<Vec<u8>> {
    Ok(client
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await?
        .to_vec())
}

pub async fn text(client: &reqwest::Client, url: &str) -> Fetching<String> {
    Ok(client
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .text()
        .await?)
}

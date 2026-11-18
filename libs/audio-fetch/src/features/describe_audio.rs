use std::path::Path;

use crate::entities::site::extract;
use crate::entities::yt_dlp::{self, Described};
use crate::shared::error::Fetching;

#[tracing::instrument(skip(client, cache))]
pub async fn describe_audio(
    client: &reqwest::Client,
    url: &str,
    cache: &Path,
) -> Fetching<Described> {
    match extract(client, url, cache).await {
        Ok(found) => Ok(Described {
            title: found.title,
            artist: found.artist,
        }),
        Err(error) => {
            tracing::warn!(%error, "built-in lookup failed, falling back to yt-dlp");
            let program = yt_dlp::install(client, cache).await?;
            yt_dlp::describe(&program, url).await
        }
    }
}

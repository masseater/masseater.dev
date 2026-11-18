use futures::{StreamExt, TryStreamExt};

use super::error::{Fetching, site_failure};

const PARTIAL: u16 = 206;

fn spans(length: u64, chunk: u64) -> Vec<(u64, u64)> {
    let mut spans = Vec::new();
    let mut start = 0;
    while start < length {
        let end = (start + chunk).min(length) - 1;
        spans.push((start, end));
        start = end + 1;
    }
    spans
}

#[tracing::instrument(skip(client, url))]
pub async fn download(
    client: &reqwest::Client,
    url: &str,
    length: u64,
    chunk: u64,
    concurrency: usize,
) -> Fetching<Vec<u8>> {
    let parts: Vec<Vec<u8>> = futures::stream::iter(spans(length, chunk).into_iter().map(
        |(start, end)| async move {
            let response = client
                .get(url)
                .header(reqwest::header::RANGE, format!("bytes={start}-{end}"))
                .send()
                .await?
                .error_for_status()?;
            if response.status().as_u16() != PARTIAL {
                return Err(site_failure(format!(
                    "range not honoured: {}",
                    response.status()
                )));
            }
            Ok(response.bytes().await?.to_vec())
        },
    ))
    .buffered(concurrency)
    .try_collect()
    .await?;
    let joined = parts.concat();
    if u64::try_from(joined.len()).ok() != Some(length) {
        return Err(site_failure(format!(
            "expected {length} bytes, got {}",
            joined.len()
        )));
    }
    Ok(joined)
}

#[cfg(test)]
mod tests {
    use super::spans;

    #[test]
    fn spans_cover_every_byte_once() {
        assert_eq!(spans(10, 4), vec![(0, 3), (4, 7), (8, 9)]);
        assert_eq!(spans(8, 4), vec![(0, 3), (4, 7)]);
        assert_eq!(spans(0, 4), Vec::new());
    }
}

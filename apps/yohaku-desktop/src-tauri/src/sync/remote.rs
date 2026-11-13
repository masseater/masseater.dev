use reqwest::Client;

use crate::failure::{Failure, Outcome};

use super::documents::{CHANGES_PATH, Changes, DOCUMENTS_PATH, Pushed, SYNC_ORIGIN, SyncDocument};

pub async fn fetch_changes(http: &Client, access_token: &str, after: i64) -> Outcome<Changes> {
    let response = http
        .get(format!("{SYNC_ORIGIN}{CHANGES_PATH}"))
        .query(&[("after", after.to_string())])
        .bearer_auth(access_token)
        .send()
        .await?
        .error_for_status()?;
    response.json().await.map_err(Failure::from)
}

pub async fn push_documents(
    http: &Client,
    access_token: &str,
    documents: &[SyncDocument],
) -> Outcome<()> {
    http.put(format!("{SYNC_ORIGIN}{DOCUMENTS_PATH}"))
        .bearer_auth(access_token)
        .json(&Pushed { documents })
        .send()
        .await?
        .error_for_status()?;
    Ok(())
}

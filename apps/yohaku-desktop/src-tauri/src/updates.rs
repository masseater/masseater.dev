use tauri::AppHandle;
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::failure::{Failure, Outcome};
use crate::model::Release;

const PERCENT: u64 = 100;

impl From<tauri_plugin_updater::Error> for Failure {
    fn from(error: tauri_plugin_updater::Error) -> Self {
        Self::new(error.to_string())
    }
}

async fn latest(app: &AppHandle) -> Outcome<Option<Update>> {
    Ok(app.updater()?.check().await?)
}

pub async fn available(app: &AppHandle) -> Option<Release> {
    latest(app)
        .await
        .unwrap_or_else(|failure| {
            eprintln!("update check failed: {failure}");
            None
        })
        .map(|update| Release {
            version: update.version,
        })
}

fn percent(received: u64, total: Option<u64>) -> Option<u8> {
    let total = total.filter(|total| *total > 0)?;
    u8::try_from(received.min(total) * PERCENT / total).ok()
}

pub async fn install(app: &AppHandle, mut progress: impl FnMut(u8)) -> Outcome<()> {
    let update = latest(app).await?.ok_or_else(Failure::not_found)?;
    let mut received = 0_u64;
    update
        .download_and_install(
            |chunk, total| {
                received += u64::try_from(chunk).unwrap_or(u64::MAX);
                if let Some(done) = percent(received, total) {
                    progress(done);
                }
            },
            || {},
        )
        .await?;
    app.restart()
}

#[cfg(test)]
mod tests {
    use super::percent;

    #[test]
    fn reports_progress_as_a_percentage() {
        assert_eq!(percent(0, Some(200)), Some(0));
        assert_eq!(percent(50, Some(200)), Some(25));
        assert_eq!(percent(300, Some(200)), Some(100));
        assert_eq!(percent(10, None), None);
        assert_eq!(percent(10, Some(0)), None);
    }
}

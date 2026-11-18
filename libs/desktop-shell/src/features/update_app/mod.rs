use tauri::plugin::{Builder, TauriPlugin};
use tauri::{AppHandle, Runtime, async_runtime};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;

const RESTART: &str = "再起動して更新";
const LATER: &str = "あとで";

fn agreed<R: Runtime>(app: &AppHandle<R>, version: &str) -> bool {
    let name = &app.package_info().name;
    app.dialog()
        .message(format!("{name} {version} に更新できます。"))
        .buttons(MessageDialogButtons::OkCancelCustom(
            RESTART.to_owned(),
            LATER.to_owned(),
        ))
        .blocking_show()
}

#[tracing::instrument(skip_all)]
async fn update<R: Runtime>(app: AppHandle<R>) -> tauri_plugin_updater::Result<()> {
    let Some(update) = app.updater()?.check().await? else {
        return Ok(());
    };
    let installer = update.download(|_, _| {}, || {}).await?;
    let version = update.version.clone();
    let asking = app.clone();
    let agreed = async_runtime::spawn_blocking(move || agreed(&asking, &version))
        .await
        .unwrap_or(false);
    if agreed {
        update.install(installer)?;
        app.restart();
    }
    Ok(())
}

#[must_use]
pub fn updates_plugin<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("updates")
        .setup(|app, _api| {
            if !tauri::is_dev() {
                let app = app.clone();
                async_runtime::spawn(async move {
                    if let Err(failure) = update(app).await {
                        tracing::warn!(%failure, "update failed");
                    }
                });
            }
            Ok(())
        })
        .build()
}

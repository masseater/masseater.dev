use serde::Deserialize;
use tauri::State;
use tauri::async_runtime;
use tauri::ipc::Channel;

use crate::entities::engine::{
    Direction, Engine, Phase, STOPPED, Server, translate as translate_chunks,
};

const CANCELLED: &str = "cancelled";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslateRequest {
    text: String,
    #[serde(flatten)]
    direction: Direction,
}

async fn ready_server(engine: &Engine) -> Result<Server, String> {
    let mut phases = engine.phase.subscribe();
    let phase = phases
        .wait_for(Phase::settled)
        .await
        .map_err(|error| error.to_string())?;
    match &*phase {
        Phase::Ready(server) => Ok(server.clone()),
        Phase::Failed(message) => Err(message.clone()),
        Phase::Idle | Phase::Downloading(_) | Phase::Starting => Err(STOPPED.to_owned()),
    }
}

#[tauri::command]
pub async fn translate(
    engine: State<'_, Engine>,
    request: TranslateRequest,
    on_delta: Channel<String>,
) -> Result<(), String> {
    let server = ready_server(&engine).await?;
    let task = async_runtime::spawn(async move {
        translate_chunks(
            &request.direction,
            &request.text,
            |prompt, max_tokens| server.complete(&prompt, max_tokens),
            |delta| {
                let _ = on_delta.send(delta);
            },
        )
        .await
    });
    let previous = engine
        .inflight
        .lock()
        .ok()
        .and_then(|mut slot| slot.replace(task.inner().abort_handle()));
    if let Some(previous) = previous {
        previous.abort();
    }
    task.await.map_or_else(
        |_| Err(CANCELLED.to_owned()),
        |result| result.map_err(|error| error.to_string()),
    )
}

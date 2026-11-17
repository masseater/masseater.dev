use tauri::State;

use crate::entities::media_notes::MediaNotes;
use crate::shared::lib::Failure;
use crate::shared::protocol::McpAccess;

#[tauri::command]
#[specta::specta]
#[expect(
    clippy::needless_pass_by_value,
    reason = "Tauri hands managed state to commands by value"
)]
pub fn mcp_access(notes: State<'_, MediaNotes>) -> Result<McpAccess, Failure> {
    Ok(notes.mcp.clone())
}

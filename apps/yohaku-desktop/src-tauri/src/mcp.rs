use axum::Router;
use axum::extract::{RawQuery, State};
use axum::http::request::Parts;
use axum::http::{HeaderMap, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::handler::server::tool::Extension;
use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::{CallToolResult, ContentBlock, Implementation, ServerCapabilities, ServerConfig};
use rmcp::{ErrorData, ServerHandler, tool, tool_handler, tool_router};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::failure::Outcome;
use crate::protocol::{Fact, SourceOrigin};
use crate::store::sources::{self, NewSource};
use crate::store::{Store, manuscripts};
use crate::sync::{CALLBACK_PATH, Syncer};

pub const PORT: u16 = 47_210;
const UNKNOWN_CLIENT: &str = "MCP";
const SIGNED_IN: &str = "同期をつなぎました。このタブを閉じてください。";
const NOT_SIGNED_IN: &str = "同期をつなげませんでした。余白に戻ってもう一度つないでください。";

#[derive(Deserialize, JsonSchema)]
struct ReadInput {
    #[schemars(description = "list_manuscripts が返す原稿の id")]
    id: String,
}

#[derive(Deserialize, JsonSchema)]
struct AddInput {
    #[schemars(description = "資料の短い名前。例: pixiv 百科事典 ヤチヨ")]
    label: String,
    #[schemars(
        description = "資料から取り出した事実。kind は character・voice・event・knowledge・setting・idea のどれか。when は作中の時点で、分からなければ null"
    )]
    facts: Vec<Fact>,
}

#[derive(Clone)]
struct Tools {
    store: Store,
    tool_router: ToolRouter<Self>,
}

fn answer<T: Serialize>(outcome: Outcome<T>) -> CallToolResult {
    match outcome.and_then(|value| Ok(serde_json::to_string(&value)?)) {
        Ok(text) => CallToolResult::success(vec![ContentBlock::text(text)]),
        Err(failure) => CallToolResult::error(vec![ContentBlock::text(failure.message)]),
    }
}

fn client_of(headers: &HeaderMap) -> String {
    let agent = headers
        .get(header::USER_AGENT)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    if agent.to_lowercase().contains("claude-code") {
        return "Claude Code".to_owned();
    }
    agent
        .split(['/', ' '])
        .find(|product| !product.is_empty())
        .unwrap_or(UNKNOWN_CLIENT)
        .to_owned()
}

#[tool_router]
impl Tools {
    fn new(store: Store) -> Self {
        Self {
            store,
            tool_router: Self::tool_router(),
        }
    }

    #[tool(
        description = "書き手の原稿の一覧を返す。題名は書き手が付けたもの（by: writer）か AI の仮のもの（by: ai）",
        annotations(read_only_hint = true)
    )]
    async fn list_manuscripts(&self) -> Result<CallToolResult, ErrorData> {
        Ok(answer(
            self.store.with(|connection| manuscripts::list(connection)),
        ))
    }

    #[tool(
        description = "原稿の段落を順に返す。本文・メモ・ネタが混ざっている",
        annotations(read_only_hint = true)
    )]
    async fn read_manuscript(
        &self,
        Parameters(ReadInput { id }): Parameters<ReadInput>,
    ) -> Result<CallToolResult, ErrorData> {
        Ok(answer(self.store.with(|connection| {
            manuscripts::paragraphs(connection, &id)
        })))
    }

    #[tool(
        description = "エディタがすでに持っている作品理解（人物・口調・出来事・知識・設定）を返す。add_source の前に読み、重複を避ける",
        annotations(read_only_hint = true)
    )]
    async fn list_facts(&self) -> Result<CallToolResult, ErrorData> {
        Ok(answer(
            self.store.with(|connection| sources::facts(connection)),
        ))
    }

    #[tool(
        description = "原作の資料や視聴メモから取り出した事実を、出典つきでエディタの作品理解に足す。書き手はエディタの資料の画面からいつでも戻せる",
        annotations(read_only_hint = false, destructive_hint = false)
    )]
    async fn add_source(
        &self,
        Parameters(AddInput { label, facts }): Parameters<AddInput>,
        Extension(parts): Extension<Parts>,
    ) -> Result<CallToolResult, ErrorData> {
        let client = client_of(&parts.headers);
        let source = NewSource {
            label: &label,
            origin: SourceOrigin::Mcp,
            client: &client,
            manuscript_id: None,
            facts: &facts,
        };
        Ok(answer(
            self.store
                .with(|connection| sources::add(connection, &source)),
        ))
    }
}

#[tool_handler(router = self.tool_router)]
#[expect(
    clippy::unused_async_trait_impl,
    reason = "rmcp's tool_handler generates the async handlers"
)]
impl ServerHandler for Tools {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("yohaku", env!("CARGO_PKG_VERSION")))
    }
}

async fn signed_in(State(syncer): State<Syncer>, RawQuery(query): RawQuery) -> Response {
    let callback = format!(
        "http://{}:{PORT}{CALLBACK_PATH}?{}",
        local_mcp::HOST,
        query.unwrap_or_default()
    );
    match syncer.callback(&callback).await {
        Ok(()) => SIGNED_IN.into_response(),
        Err(failure) => {
            log::warn!("sync sign-in failed: {failure}");
            (StatusCode::BAD_REQUEST, NOT_SIGNED_IN).into_response()
        }
    }
}

fn router(store: Store, syncer: Syncer, token: String) -> Router {
    Router::new()
        .route(CALLBACK_PATH, get(signed_in).with_state(syncer))
        .merge(local_mcp::router(token, move || Tools::new(store.clone())))
}

pub async fn serve(store: Store, syncer: Syncer, token: String) -> Outcome<()> {
    local_mcp::serve(PORT, router(store, syncer, token)).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use axum::http::{HeaderMap, HeaderValue, header};

    use super::client_of;

    #[test]
    fn names_the_client_from_its_user_agent() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::USER_AGENT,
            HeaderValue::from_static("claude-code/2.1.323"),
        );
        assert_eq!(client_of(&headers), "Claude Code");
        headers.insert(
            header::USER_AGENT,
            HeaderValue::from_static("Cursor/1.0 (macOS)"),
        );
        assert_eq!(client_of(&headers), "Cursor");
    }
}

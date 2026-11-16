use std::sync::Arc;

use axum::Router;
use media_notes::failure::Outcome;
use media_notes::mcp::answer;
use media_notes::protocol::Site;
use media_notes::source::{link_at, range, source_of};
use media_notes::store::Store;
use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::{CallToolResult, Implementation, ServerCapabilities, ServerConfig};
use rmcp::{ErrorData, ServerHandler, tool, tool_handler, tool_router};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::commands::resolved;
use crate::protocol::{Comment, Resolution};

pub const PORT: u16 = 47_240;

pub type Changed = Arc<dyn Fn() + Send + Sync>;

#[derive(Clone)]
pub struct Serving {
    pub store: Store,
    pub token: String,
    pub changed: Changed,
}

#[derive(Deserialize, JsonSchema)]
struct ListInput {
    #[schemars(
        description = "動画で絞る。YouTube・ニコニコのリンク、ファイルの SHA-256、ファイル名のどれか"
    )]
    media: Option<String>,
    #[schemars(description = "true なら、まだ直していないコメントだけを返す")]
    open_only: Option<bool>,
}

#[derive(Deserialize, JsonSchema)]
struct ResolveInput {
    #[schemars(description = "list_comments が返したコメントの id")]
    id: String,
    #[schemars(description = "どう直したか。持ち主がアプリで読む")]
    words: String,
}

#[derive(Serialize)]
struct Brief {
    id: String,
    title: String,
    site: Site,
    sha256: Option<String>,
    file: Option<String>,
    link: Option<String>,
    range: String,
    from: f64,
    to: f64,
    words: String,
    resolution: Option<Resolution>,
}

fn brief_of(comment: Comment) -> Brief {
    let source = &comment.media.source;
    let file = source.site == Site::File;
    Brief {
        sha256: file.then(|| source.id.clone()),
        file: file.then(|| comment.location.clone()),
        link: link_at(source, comment.from),
        site: source.site,
        range: range(comment.from, comment.to),
        id: comment.id,
        title: comment.media.title,
        from: comment.from,
        to: comment.to,
        words: comment.words,
        resolution: comment.resolution,
    }
}

fn names(wanted: &str, comment: &Comment) -> bool {
    let wanted = wanted.trim();
    let source = &comment.media.source;
    source_of(wanted).is_some_and(|linked| &linked == source)
        || source.id.eq_ignore_ascii_case(wanted)
        || (source.site == Site::File && comment.media.title == wanted)
}

fn matches(input: &ListInput, comment: &Comment) -> bool {
    input
        .media
        .as_deref()
        .is_none_or(|wanted| names(wanted, comment))
        && !(input.open_only == Some(true) && comment.resolution.is_some())
}

fn listed(store: &Store, input: &ListInput) -> Outcome<Vec<Brief>> {
    Ok(store
        .list::<Comment>(None)?
        .into_iter()
        .filter(|comment| matches(input, comment))
        .map(brief_of)
        .collect())
}

#[derive(Clone)]
struct Tools {
    serving: Serving,
    tool_router: ToolRouter<Self>,
}

#[tool_router]
impl Tools {
    fn new(serving: Serving) -> Self {
        Self {
            serving,
            tool_router: Self::tool_router(),
        }
    }

    #[tool(
        description = "持ち主が動画の範囲に書いた感想や直してほしいことを新しい順に返す。動画は YouTube・ニコニコのリンクか、持ち主の PC のファイル。ファイルは sha256 で版を見分ける。range と from・to は秒の範囲、words は持ち主の言葉、resolution は直したと印を付けたときの記録。動画を作る前や直す前に呼び、持ち主の意図の根拠として読む。",
        annotations(read_only_hint = true)
    )]
    async fn list_comments(
        &self,
        Parameters(input): Parameters<ListInput>,
    ) -> Result<CallToolResult, ErrorData> {
        Ok(answer(listed(&self.serving.store, &input)))
    }

    #[tool(
        description = "コメントの指摘を直したと印を付け、どう直したかを残す。持ち主のアプリでは、そのコメントが直した扱いで表示される。"
    )]
    async fn resolve_comment(
        &self,
        Parameters(input): Parameters<ResolveInput>,
    ) -> Result<CallToolResult, ErrorData> {
        let outcome = resolved(&self.serving.store, &input.id, input.words).map(brief_of);
        if outcome.is_ok() {
            (self.serving.changed)();
        }
        Ok(answer(outcome))
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
            .with_server_info(Implementation::new("akapen", env!("CARGO_PKG_VERSION")))
    }
}

fn router(serving: Serving) -> Router {
    let token = serving.token.clone();
    local_mcp::router(token, move || Tools::new(serving.clone()))
}

pub async fn serve(serving: Serving) -> std::io::Result<()> {
    local_mcp::serve(PORT, router(serving)).await
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    use media_notes::protocol::{Media, Site, Source};
    use media_notes::store::Store;
    use tokio::net::TcpListener;

    use super::{ListInput, Serving, Tools, listed, router};
    use crate::commands::{TABLE, saved};
    use crate::protocol::CommentInput;

    const INITIALIZE: &str = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}"#;
    const DIGEST: &str = "594cfd2607d4f09e1ce6241203e418cacfed545063792bc5eab7afaadbf0c4e0";

    fn on_file(words: &str) -> CommentInput {
        CommentInput {
            media: Media {
                source: Source {
                    site: Site::File,
                    id: DIGEST.to_owned(),
                },
                title: "pv-v11.mp4".to_owned(),
                artist: String::new(),
            },
            location: "C:\\Users\\u1\\Videos\\pv-v11.mp4".to_owned(),
            from: 4.0,
            to: 9.5,
            words: words.to_owned(),
        }
    }

    fn on_youtube(words: &str) -> CommentInput {
        CommentInput {
            media: Media {
                source: Source {
                    site: Site::Youtube,
                    id: "aaaaaaaaaaa".to_owned(),
                },
                title: "MV".to_owned(),
                artist: "作者".to_owned(),
            },
            location: "https://youtu.be/aaaaaaaaaaa".to_owned(),
            from: 61.0,
            to: 70.0,
            words: words.to_owned(),
        }
    }

    fn serving(store: Store, count: Arc<AtomicUsize>) -> Serving {
        Serving {
            store,
            token: "secret".to_owned(),
            changed: Arc::new(move || {
                count.fetch_add(1, Ordering::SeqCst);
            }),
        }
    }

    #[test]
    fn finds_comments_by_link_digest_or_file_name() {
        let store = Store::in_memory(TABLE).expect("store");
        saved(&store, on_file("テロップが早い")).expect("file comment");
        saved(&store, on_youtube("この切り替え")).expect("link comment");
        let ask = |media: &str| ListInput {
            media: Some(media.to_owned()),
            open_only: None,
        };
        let by_name = listed(&store, &ask("pv-v11.mp4")).expect("by name");
        assert_eq!(by_name.len(), 1);
        assert_eq!(by_name[0].sha256.as_deref(), Some(DIGEST));
        assert_eq!(by_name[0].range, "0:04–0:09");
        assert_eq!(listed(&store, &ask(DIGEST)).expect("by digest").len(), 1);
        let by_link =
            listed(&store, &ask("https://www.youtube.com/watch?v=aaaaaaaaaaa")).expect("by link");
        assert_eq!(
            by_link[0].link.as_deref(),
            Some("https://youtu.be/aaaaaaaaaaa?t=61")
        );
    }

    #[tokio::test]
    async fn resolving_hides_a_comment_from_open_ones_and_tells_the_screen() {
        let store = Store::in_memory(TABLE).expect("store");
        let comment = saved(&store, on_file("黒画面が長い")).expect("comment");
        let count = Arc::new(AtomicUsize::new(0));
        let tools = Tools::new(serving(store.clone(), count.clone()));
        tools
            .resolve_comment(rmcp::handler::server::wrapper::Parameters(
                super::ResolveInput {
                    id: comment.id,
                    words: "1 秒に縮めた".to_owned(),
                },
            ))
            .await
            .expect("resolved");
        assert_eq!(count.load(Ordering::SeqCst), 1);
        let open = ListInput {
            media: None,
            open_only: Some(true),
        };
        assert!(listed(&store, &open).expect("open").is_empty());
        let every = ListInput {
            media: None,
            open_only: None,
        };
        let briefs = listed(&store, &every).expect("every");
        assert_eq!(
            briefs[0]
                .resolution
                .as_ref()
                .map(|done| done.words.as_str()),
            Some("1 秒に縮めた")
        );
    }

    #[tokio::test]
    async fn answers_only_with_the_token() {
        let listener = TcpListener::bind(("127.0.0.1", 0)).await.expect("listener");
        let address = listener.local_addr().expect("address");
        let store = Store::in_memory(TABLE).expect("store");
        tokio::spawn(local_mcp::serve_on(
            listener,
            router(serving(store, Arc::new(AtomicUsize::new(0)))),
        ));
        let client = reqwest::Client::new();
        let url = format!("http://{address}/mcp");
        let ask = |bearer: &str| {
            client
                .post(&url)
                .bearer_auth(bearer)
                .header("accept", "application/json, text/event-stream")
                .header("content-type", "application/json")
                .body(INITIALIZE)
                .send()
        };
        assert_eq!(ask("wrong").await.expect("refused").status(), 401);
        let answer = ask("secret").await.expect("answered");
        assert_eq!(answer.status(), 200);
        assert!(answer.text().await.expect("body").contains("akapen"));
    }
}

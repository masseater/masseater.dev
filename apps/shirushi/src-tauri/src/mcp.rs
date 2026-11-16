use axum::Router;
use media_notes::failure::Outcome;
use media_notes::mcp::answer;
use media_notes::source::{link_at, page_of, range, source_of};
use media_notes::store::Store;
use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::{CallToolResult, Implementation, ServerCapabilities, ServerConfig};
use rmcp::{ErrorData, ServerHandler, tool, tool_handler, tool_router};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::protocol::{Aspect, Mark, Verb};

pub const PORT: u16 = 47_230;

#[derive(Deserialize, JsonSchema)]
struct ListInput {
    #[schemars(
        description = "YouTube・ニコニコ・SoundCloud の曲のリンク。渡すとその曲のしるしだけを返す"
    )]
    url: Option<String>,
    #[schemars(description = "like（好き）か dislike（苦手）で絞る")]
    verb: Option<Verb>,
    #[schemars(description = "どこが良い・悪いかで絞る")]
    aspect: Option<Aspect>,
}

#[derive(Serialize)]
struct Brief {
    verb: Verb,
    title: String,
    artist: String,
    page: String,
    range: String,
    link: String,
    from: f64,
    to: f64,
    aspects: Vec<Aspect>,
    words: String,
}

fn brief_of(mark: Mark) -> Brief {
    let source = &mark.song.source;
    Brief {
        verb: mark.verb,
        page: page_of(source).unwrap_or_default(),
        link: link_at(source, mark.from).unwrap_or_default(),
        range: range(mark.from, mark.to),
        title: mark.song.title,
        artist: mark.song.artist,
        from: mark.from,
        to: mark.to,
        aspects: mark.aspects,
        words: mark.words,
    }
}

fn matches(input: &ListInput, mark: &Mark) -> bool {
    input.verb.is_none_or(|verb| verb == mark.verb)
        && input
            .aspect
            .is_none_or(|aspect| mark.aspects.contains(&aspect))
}

fn listed(store: &Store, input: &ListInput) -> Outcome<Vec<Brief>> {
    let source = input.url.as_deref().and_then(source_of);
    Ok(store
        .list::<Mark>(source.as_ref())?
        .into_iter()
        .filter(|mark| matches(input, mark))
        .map(brief_of)
        .collect())
}

#[derive(Clone)]
struct Tools {
    store: Store,
    tool_router: ToolRouter<Self>,
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
        description = "持ち主が YouTube・ニコニコ・SoundCloud の曲に付けた「しるし」を新しい順に返す。しるしは曲の範囲（秒）、好きか苦手か、どこが（rhythm・bass・chords・melody・tone・voice・arrangement・mix）、持ち主の言葉からなる。link はその範囲の始まりから再生するリンク。曲を作る前や直す前に呼び、持ち主の好みの根拠として読む。",
        annotations(read_only_hint = true)
    )]
    async fn list_marks(
        &self,
        Parameters(input): Parameters<ListInput>,
    ) -> Result<CallToolResult, ErrorData> {
        Ok(answer(listed(&self.store, &input)))
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
            .with_server_info(Implementation::new("shirushi", env!("CARGO_PKG_VERSION")))
    }
}

fn router(store: Store, token: String) -> Router {
    local_mcp::router(token, move || Tools::new(store.clone()))
}

pub async fn serve(store: Store, token: String) -> std::io::Result<()> {
    local_mcp::serve(PORT, router(store, token)).await
}

#[cfg(test)]
mod tests {
    use media_notes::protocol::{Media, Site, Source};
    use media_notes::store::Store;
    use tokio::net::TcpListener;

    use super::{ListInput, listed, router};
    use crate::commands::{TABLE, saved};
    use crate::protocol::{Aspect, MarkInput, Verb};

    const INITIALIZE: &str = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}"#;

    fn input(id: &str, verb: Verb) -> MarkInput {
        MarkInput {
            song: Media {
                source: Source {
                    site: Site::Youtube,
                    id: id.to_owned(),
                },
                title: "曲".to_owned(),
                artist: "作者".to_owned(),
            },
            from: 61.5,
            to: 75.0,
            verb,
            aspects: vec![Aspect::Bass, Aspect::Chords],
            words: "ベースが跳ねる".to_owned(),
        }
    }

    #[tokio::test]
    async fn answers_only_with_the_token() {
        let listener = TcpListener::bind(("127.0.0.1", 0)).await.expect("listener");
        let address = listener.local_addr().expect("address");
        let store = Store::in_memory(TABLE).expect("store");
        tokio::spawn(local_mcp::serve_on(
            listener,
            router(store, "secret".to_owned()),
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
        assert!(answer.text().await.expect("body").contains("shirushi"));
    }

    #[test]
    fn narrows_marks_by_song_verb_and_aspect() {
        let store = Store::in_memory(TABLE).expect("store");
        saved(&store, input("aaaaaaaaaaa", Verb::Like)).expect("liked");
        saved(&store, input("aaaaaaaaaaa", Verb::Dislike)).expect("disliked");
        saved(&store, input("bbbbbbbbbbb", Verb::Like)).expect("other");
        let song = ListInput {
            url: Some("https://youtu.be/aaaaaaaaaaa".to_owned()),
            verb: Some(Verb::Like),
            aspect: Some(Aspect::Bass),
        };
        let briefs = listed(&store, &song).expect("briefs");
        assert_eq!(briefs.len(), 1);
        assert_eq!(briefs[0].range, "1:01–1:15");
        assert_eq!(briefs[0].link, "https://youtu.be/aaaaaaaaaaa?t=61");
        let melody = ListInput {
            url: None,
            verb: None,
            aspect: Some(Aspect::Melody),
        };
        assert!(listed(&store, &melody).expect("none").is_empty());
    }
}

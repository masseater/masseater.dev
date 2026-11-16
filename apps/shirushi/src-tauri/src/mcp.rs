use std::sync::Arc;

use axum::Router;
use media_notes::credit::media_of;
use media_notes::failure::{Failure, Outcome};
use media_notes::mcp::answer;
use media_notes::protocol::{Media, Site};
use media_notes::source::{link_at, page_of, range, source_of};
use media_notes::store::Store;
use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::{CallToolResult, Implementation, ServerCapabilities, ServerConfig};
use rmcp::{ErrorData, ServerHandler, tool, tool_handler, tool_router};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::protocol::{
    Aspect, Choice, Clip, Forecast, Judgement, Mark, Pair, PairInput, PredictionInput, Statement,
    StatementInput, Verb, Verdict,
};
use crate::taste::{Taste, forecasts, paired, predicted, stated};

pub const PORT: u16 = 47_230;
const NOT_MEDIA: &str = "開けるリンクではありません";

pub type Changed = Arc<dyn Fn() + Send + Sync>;

#[derive(Clone)]
pub struct Serving {
    pub store: Store,
    pub taste: Taste,
    pub client: reqwest::Client,
    pub sites: &'static [Site],
    pub token: String,
    pub changed: Changed,
}

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

#[derive(Deserialize, JsonSchema)]
struct ClipInput {
    #[schemars(description = "YouTube・ニコニコ・SoundCloud の曲のリンク")]
    url: String,
    #[schemars(description = "範囲の始まり（秒）")]
    from: f64,
    #[schemars(description = "範囲の終わり（秒）")]
    to: f64,
}

#[derive(Deserialize, JsonSchema)]
struct PairRequest {
    a: ClipInput,
    b: ClipInput,
}

#[derive(Deserialize, JsonSchema)]
struct StatementRequest {
    #[schemars(
        description = "持ち主の好みについての見立てを 1 文で。例: サビ直前に音が一度消える展開が好き"
    )]
    words: String,
    #[schemars(description = "根拠にしたしるしの link か範囲の説明")]
    evidence: Vec<String>,
}

#[derive(Deserialize, JsonSchema)]
struct PredictionRequest {
    #[schemars(description = "持ち主がまだ聴いていない曲のリンク")]
    url: String,
    #[schemars(description = "範囲の始まり（秒）")]
    from: f64,
    #[schemars(description = "範囲の終わり（秒）")]
    to: f64,
    #[schemars(description = "持ち主が like（好き）と dislike（苦手）のどちらを付けると見るか")]
    verb: Verb,
}

#[derive(Deserialize, JsonSchema)]
struct SongFilter {
    #[schemars(description = "渡すとその曲だけを返す")]
    url: Option<String>,
}

#[derive(Serialize)]
struct ClipBrief {
    title: String,
    artist: String,
    range: String,
    link: String,
}

fn clip_brief(clip: Clip) -> ClipBrief {
    ClipBrief {
        range: range(clip.from, clip.to),
        link: link_at(&clip.media.source, clip.from).unwrap_or_default(),
        title: clip.media.title,
        artist: clip.media.artist,
    }
}

#[derive(Serialize)]
struct PairBrief {
    id: String,
    a: ClipBrief,
    b: ClipBrief,
    choice: Option<Choice>,
}

fn pair_brief(pair: Pair) -> PairBrief {
    PairBrief {
        id: pair.id,
        a: clip_brief(pair.a),
        b: clip_brief(pair.b),
        choice: pair.choice,
    }
}

#[derive(Serialize)]
struct StatementBrief {
    id: String,
    words: String,
    evidence: Vec<String>,
    judgement: Option<Judgement>,
}

fn statement_brief(statement: Statement) -> StatementBrief {
    StatementBrief {
        id: statement.id,
        words: statement.words,
        evidence: statement.evidence,
        judgement: statement.judgement,
    }
}

#[derive(Serialize)]
struct ForecastBrief {
    id: String,
    clip: ClipBrief,
    verb: Verb,
    verdict: Verdict,
}

fn forecast_brief(forecast: Forecast) -> ForecastBrief {
    let prediction = forecast.prediction;
    ForecastBrief {
        id: prediction.id,
        verb: prediction.verb,
        verdict: forecast.verdict,
        clip: clip_brief(Clip {
            media: prediction.media,
            from: prediction.from,
            to: prediction.to,
        }),
    }
}

#[derive(Clone)]
struct Tools {
    serving: Serving,
    tool_router: ToolRouter<Self>,
}

impl Tools {
    async fn media(&self, url: &str) -> Outcome<Media> {
        let source = source_of(url)
            .filter(|source| self.serving.sites.contains(&source.site))
            .ok_or_else(|| Failure::new(NOT_MEDIA))?;
        Ok(media_of(&self.serving.client, source).await)
    }

    async fn clip(&self, input: ClipInput) -> Outcome<Clip> {
        Ok(Clip {
            media: self.media(&input.url).await?,
            from: input.from,
            to: input.to,
        })
    }

    async fn pair(&self, request: PairRequest) -> Outcome<PairBrief> {
        let input = PairInput {
            a: self.clip(request.a).await?,
            b: self.clip(request.b).await?,
        };
        paired(&self.serving.taste, input).map(pair_brief)
    }

    async fn prediction(&self, request: PredictionRequest) -> Outcome<ForecastBrief> {
        let input = PredictionInput {
            media: self.media(&request.url).await?,
            from: request.from,
            to: request.to,
            verb: request.verb,
        };
        predicted(&self.serving.taste, input).map(|prediction| {
            forecast_brief(Forecast {
                prediction,
                verdict: Verdict::Open,
            })
        })
    }

    fn told<T>(&self, outcome: Outcome<T>) -> Outcome<T> {
        if outcome.is_ok() {
            (self.serving.changed)();
        }
        outcome
    }

    fn forecasts(&self, filter: &SongFilter) -> Outcome<Vec<ForecastBrief>> {
        let marks = self.serving.store.list::<Mark>(None)?;
        let source = filter.url.as_deref().and_then(source_of);
        Ok(forecasts(&self.serving.taste, &marks, source.as_ref())?
            .into_iter()
            .map(forecast_brief)
            .collect())
    }
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
        description = "持ち主が YouTube・ニコニコ・SoundCloud の曲に付けた「しるし」を新しい順に返す。しるしは曲の範囲（秒）、好きか苦手か、どこが（rhythm・bass・chords・melody・tone・voice・arrangement・mix）、持ち主の言葉からなる。link はその範囲の始まりから再生するリンク。曲を作る前や直す前に呼び、持ち主の好みの根拠として読む。",
        annotations(read_only_hint = true)
    )]
    async fn list_marks(
        &self,
        Parameters(input): Parameters<ListInput>,
    ) -> Result<CallToolResult, ErrorData> {
        Ok(answer(listed(&self.serving.store, &input)))
    }

    #[tool(
        description = "持ち主に二択を出す。a と b に曲の範囲を 1 つずつ渡すと、持ち主のアプリの「二択」に並び、持ち主はどちらが好きかを選ぶ。好みの境目を確かめたいときに、似ているが違う 2 つの範囲を選んで出す。答えは list_pairs で読む。"
    )]
    async fn propose_pair(
        &self,
        Parameters(request): Parameters<PairRequest>,
    ) -> Result<CallToolResult, ErrorData> {
        let outcome = self.pair(request).await;
        Ok(answer(self.told(outcome)))
    }

    #[tool(
        description = "出した二択と持ち主の答えを新しい順に返す。choice は a・b・neither（どちらでもない）で、まだ答えていなければ null。",
        annotations(read_only_hint = true)
    )]
    async fn list_pairs(&self) -> Result<CallToolResult, ErrorData> {
        let outcome = self
            .serving
            .taste
            .pairs
            .list::<Pair>(None)
            .map(|pairs| pairs.into_iter().map(pair_brief).collect::<Vec<_>>());
        Ok(answer(outcome))
    }

    #[tool(
        description = "持ち主の好みについての見立てを 1 文で書き残す。持ち主のアプリの「AI の見立て」に並び、持ち主は合っているか違うかを付ける。しるしや二択の答えから言えることを、曲を作るときに使える具体さで書く。答えは list_statements で読む。"
    )]
    async fn write_statement(
        &self,
        Parameters(request): Parameters<StatementRequest>,
    ) -> Result<CallToolResult, ErrorData> {
        let outcome = stated(
            &self.serving.taste,
            StatementInput {
                words: request.words,
                evidence: request.evidence,
            },
        )
        .map(statement_brief);
        Ok(answer(self.told(outcome)))
    }

    #[tool(
        description = "書いた見立てと持ち主の判定を新しい順に返す。judgement は right（合っている）か wrong（違う）で、まだなら null。right の見立ては持ち主の好みとして使い、wrong の見立ては使わない。",
        annotations(read_only_hint = true)
    )]
    async fn list_statements(&self) -> Result<CallToolResult, ErrorData> {
        let outcome = self
            .serving
            .taste
            .statements
            .list::<Statement>(None)
            .map(|statements| {
                statements
                    .into_iter()
                    .map(statement_brief)
                    .collect::<Vec<_>>()
            });
        Ok(answer(outcome))
    }

    #[tool(
        description = "持ち主がまだ聴いていない曲で、どの範囲に like か dislike を付けるかを予想して残す。持ち主が聴き終えてしるしを付けると、予想が当たったかが決まる。答え合わせは list_predictions で読む。"
    )]
    async fn predict(
        &self,
        Parameters(request): Parameters<PredictionRequest>,
    ) -> Result<CallToolResult, ErrorData> {
        let outcome = self.prediction(request).await;
        Ok(answer(self.told(outcome)))
    }

    #[tool(
        description = "残した予想と答え合わせを新しい順に返す。verdict は hit（同じ範囲に同じしるしが付いた）、miss（その曲にしるしが付いたが外れた）、open（まだしるしが無い）。外れた予想から見立てを直す。",
        annotations(read_only_hint = true)
    )]
    async fn list_predictions(
        &self,
        Parameters(filter): Parameters<SongFilter>,
    ) -> Result<CallToolResult, ErrorData> {
        Ok(answer(self.forecasts(&filter)))
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

fn router(serving: Serving) -> Router {
    let token = serving.token.clone();
    local_mcp::router(token, move || Tools::new(serving.clone()))
}

pub async fn serve(serving: Serving) -> std::io::Result<()> {
    local_mcp::serve(PORT, router(serving)).await
}

#[cfg(test)]
mod tests {
    use media_notes::protocol::{Media, Site, Source};
    use media_notes::store::Store;
    use tokio::net::TcpListener;

    use std::sync::Arc;

    use super::{ListInput, Serving, listed, router};
    use crate::commands::{TABLE, saved};
    use crate::protocol::{Aspect, MarkInput, Verb};
    use crate::taste::Taste;

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
        let serving = Serving {
            store: Store::in_memory(TABLE).expect("store"),
            taste: Taste::in_memory().expect("taste"),
            client: reqwest::Client::new(),
            sites: &[Site::Youtube],
            token: "secret".to_owned(),
            changed: Arc::new(|| {}),
        };
        tokio::spawn(local_mcp::serve_on(listener, router(serving)));
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

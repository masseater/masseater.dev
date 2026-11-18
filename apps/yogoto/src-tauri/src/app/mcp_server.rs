use axum::Router;
use media_notes::{Failure, Outcome, answer};
use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::{CallToolResult, Implementation, ServerCapabilities, ServerConfig};
use rmcp::{ErrorData, ServerHandler, tool, tool_handler, tool_router};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use super::workshop::Workshop;
use crate::entities::model::{MODELS, model_info};
use crate::shared::protocol::{Origin, Song};

pub const PORT: u16 = 47_240;

#[derive(Clone)]
pub struct Serving {
    pub workshop: Workshop,
    pub token: String,
}

#[derive(Deserialize, JsonSchema)]
struct ImportInput {
    #[schemars(
        description = "YouTube・ニコニコ・SoundCloud などのリンク、または PC の音声ファイルの絶対パス"
    )]
    location: String,
    #[schemars(
        description = "取り込んだ後に分離するモデルの id。省くと既定のモデルで分離する。list_models で選べる id を確かめる"
    )]
    models: Option<Vec<String>>,
}

#[derive(Deserialize, JsonSchema)]
struct SeparateInput {
    #[schemars(description = "list_songs が返した曲の id")]
    song_id: String,
    #[schemars(description = "list_models が返したモデルの id")]
    model: String,
}

#[derive(Deserialize, JsonSchema)]
struct SongQuery {
    #[schemars(description = "題名か作者に含まれる文字。省くと全曲を返す")]
    query: Option<String>,
}

#[derive(Deserialize, JsonSchema)]
struct SongInput {
    #[schemars(description = "list_songs が返した曲の id")]
    id: String,
}

#[derive(Serialize)]
struct StemBrief {
    stem: String,
    path: String,
}

#[derive(Serialize)]
struct SeparationBrief {
    model: String,
    stems: Vec<StemBrief>,
}

#[derive(Serialize)]
struct SourceBrief {
    origin: String,
    path: String,
    sample_rate: i64,
    seconds: f64,
}

#[derive(Serialize)]
struct SongBrief {
    id: String,
    title: String,
    artist: String,
    sources: Vec<SourceBrief>,
    separations: Vec<SeparationBrief>,
}

fn origin_text(origin: &Origin) -> String {
    match origin {
        Origin::Url { url, .. } => url.clone(),
        Origin::File { name } => name.clone(),
    }
}

fn seconds(frames: i64, sample_rate: i64) -> f64 {
    let frames = u32::try_from(frames).map_or(f64::MAX, f64::from);
    let rate = u32::try_from(sample_rate).map_or(1.0, f64::from);
    frames / rate
}

fn brief_of(workshop: &Workshop, song: Song) -> SongBrief {
    let path = |relative: &str| {
        workshop
            .library
            .path(&song, relative)
            .to_string_lossy()
            .into_owned()
    };
    SongBrief {
        sources: song
            .sources
            .iter()
            .map(|source| SourceBrief {
                origin: origin_text(&source.origin),
                path: path(&source.file),
                sample_rate: source.sample_rate,
                seconds: seconds(source.frames, source.sample_rate),
            })
            .collect(),
        separations: song
            .separations
            .iter()
            .map(|separation| SeparationBrief {
                model: separation.model.clone(),
                stems: separation
                    .stems
                    .iter()
                    .map(|stem| StemBrief {
                        stem: stem.stem.clone(),
                        path: path(&stem.file),
                    })
                    .collect(),
            })
            .collect(),
        id: song.id,
        title: song.title,
        artist: song.artist,
    }
}

fn matches(song: &Song, query: Option<&str>) -> bool {
    query.is_none_or(|query| {
        let query = query.to_lowercase();
        song.title.to_lowercase().contains(&query) || song.artist.to_lowercase().contains(&query)
    })
}

fn listed(workshop: &Workshop, query: Option<&str>) -> Outcome<Vec<SongBrief>> {
    Ok(workshop
        .library
        .list()?
        .into_iter()
        .filter(|song| matches(song, query))
        .map(|song| brief_of(workshop, song))
        .collect())
}

#[derive(Clone)]
struct Tools {
    serving: Serving,
    tool_router: ToolRouter<Self>,
}

impl Tools {
    fn song(&self, id: &str) -> Outcome<Song> {
        self.serving
            .workshop
            .library
            .get(id)?
            .ok_or_else(|| Failure::new("曲が見つかりません"))
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
        description = "曲を取り込み、続けて音源分離を予約する。リンクなら音声だけを取得し、ファイルならそのまま写す。元の音声は再エンコードせずに保管する。同じ音声が既にあれば新しい曲を作らずその曲を返す。返す job の id は list_jobs で進み具合を確かめる。"
    )]
    async fn import_song(
        &self,
        Parameters(input): Parameters<ImportInput>,
    ) -> Result<CallToolResult, ErrorData> {
        let models = input.models.unwrap_or_default();
        Ok(answer(
            self.serving.workshop.import(&input.location, &models),
        ))
    }

    #[tool(
        description = "取り込み済みの曲を、指定したモデルで分離し直す。返す job の id は list_jobs で進み具合を確かめる。"
    )]
    async fn separate_song(
        &self,
        Parameters(input): Parameters<SeparateInput>,
    ) -> Result<CallToolResult, ErrorData> {
        let outcome = self
            .song(&input.song_id)
            .and_then(|song| self.serving.workshop.separate(&song, &input.model));
        Ok(answer(outcome))
    }

    #[tool(
        description = "取り込みと分離の job を新しい順に返す。state は queued・running・done・failed で、failed なら message に理由がある。done の job の song_id で list_songs や get_song を引く。",
        annotations(read_only_hint = true)
    )]
    async fn list_jobs(&self) -> Result<CallToolResult, ErrorData> {
        Ok(answer(Ok(self.serving.workshop.jobs.list())))
    }

    #[tool(
        description = "ライブラリの曲を新しい順に返す。各曲の元の音声と、分離した stem の FLAC の絶対パスを含む。stem は元の音声と同じ長さ・同じサンプル位置にそろっている。",
        annotations(read_only_hint = true)
    )]
    async fn list_songs(
        &self,
        Parameters(input): Parameters<SongQuery>,
    ) -> Result<CallToolResult, ErrorData> {
        Ok(answer(listed(
            &self.serving.workshop,
            input.query.as_deref(),
        )))
    }

    #[tool(
        description = "曲を 1 つ、元の音声と stem の絶対パス付きで返す。",
        annotations(read_only_hint = true)
    )]
    async fn get_song(
        &self,
        Parameters(input): Parameters<SongInput>,
    ) -> Result<CallToolResult, ErrorData> {
        Ok(answer(
            self.song(&input.id)
                .map(|song| brief_of(&self.serving.workshop, song)),
        ))
    }

    #[tool(
        description = "分離に使えるモデルと、それぞれが出す stem の名前を返す。",
        annotations(read_only_hint = true)
    )]
    async fn list_models(&self) -> Result<CallToolResult, ErrorData> {
        Ok(answer(Ok(MODELS
            .iter()
            .map(model_info)
            .collect::<Vec<_>>())))
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
            .with_server_info(Implementation::new("yogoto", env!("CARGO_PKG_VERSION")))
    }
}

fn router(serving: Serving) -> Router {
    let token = serving.token.clone();
    desktop_shell::mcp_router(token, move || Tools::new(serving.clone()))
}

pub async fn serve(serving: Serving) -> std::io::Result<()> {
    desktop_shell::serve_mcp(PORT, router(serving)).await
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use tokio::net::TcpListener;

    use super::{Serving, listed, router};
    use crate::app::workshop::Workshop;
    use crate::entities::job::Jobs;
    use crate::entities::song::Library;

    const INITIALIZE: &str = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}"#;

    fn workshop(root: &std::path::Path) -> Workshop {
        let library = Library::open(&root.join("library")).expect("library");
        Workshop::start(
            library,
            reqwest::Client::new(),
            root.join("cache"),
            Jobs::new(Arc::new(|| {})),
        )
    }

    #[tokio::test]
    async fn answers_only_with_the_token() {
        let directory = tempfile::tempdir().expect("directory");
        let listener = TcpListener::bind(("127.0.0.1", 0)).await.expect("listener");
        let address = listener.local_addr().expect("address");
        let serving = Serving {
            workshop: workshop(directory.path()),
            token: "secret".to_owned(),
        };
        tokio::spawn(desktop_shell::serve_mcp_on(listener, router(serving)));
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
        assert!(answer.text().await.expect("body").contains("yogoto"));
    }

    #[test]
    fn songs_are_found_by_title_or_artist() {
        let directory = tempfile::tempdir().expect("directory");
        let workshop = workshop(directory.path());
        let first = workshop
            .library
            .create("Night Drive", "Alpha")
            .expect("first");
        workshop.library.save(&first).expect("saved");
        let second = workshop.library.create("Morning", "Beta").expect("second");
        workshop.library.save(&second).expect("saved");
        let titles = |query| {
            listed(&workshop, query)
                .expect("listed")
                .into_iter()
                .map(|song| song.title)
                .collect::<Vec<_>>()
        };
        assert_eq!(titles(Some("night")), ["Night Drive"]);
        assert_eq!(titles(Some("BETA")), ["Morning"]);
        assert_eq!(titles(None).len(), 2);
    }
}

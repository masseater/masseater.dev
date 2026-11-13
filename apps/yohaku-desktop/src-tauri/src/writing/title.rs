use schemars::JsonSchema;
use serde::Deserialize;

use crate::failure::Outcome;

use super::agent::judge;
use super::claude::Claude;

const ENOUGH_PROSE: usize = 400;

const SYSTEM: &str = "あなたは小説の原稿を読む担当編集です。書き手はまだ題名を付けていません。
本文に合う仮の題名を一つ付けてください。煽り文句や副題を付けず、本文の言葉づかいに寄せてください。";

#[derive(Deserialize, JsonSchema)]
struct Answer {
    title: String,
}

pub async fn propose_title(claude: &Claude, prose: &[String]) -> Outcome<String> {
    let length: usize = prose
        .iter()
        .map(|text| crate::text::utf16_length(text))
        .sum();
    if length < ENOUGH_PROSE {
        return Ok(String::new());
    }
    let answer: Answer = judge(claude, SYSTEM, &prose.join("\n"), &[]).await?;
    Ok(answer.title.trim().to_owned())
}

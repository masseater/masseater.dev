use schemars::JsonSchema;
use serde::Deserialize;

use crate::failure::Outcome;
use crate::model::{Fact, Source, SourceOrigin};
use crate::store::Store;
use crate::store::sources::{self, NewSource};
use crate::text::utf16_slice;

use super::agent::judge;
use super::claude::Claude;

const WEB_TOOLS: [&str; 1] = ["WebFetch"];
const BUILT_IN_AGENT: &str = "内蔵のエージェント";
const MANUSCRIPT_LABEL: &str = "本文";
const LABEL_LENGTH: usize = 40;

const FACT_GUIDE: &str = "次の種類ごとに、作品を書くときに参照する事実を取り出してください。
- character: 人物そのもの（名前・立場・関係）。subject は人物名。
- voice: 人物の口調・一人称・口癖。body には実際の言い回しの例を入れる。
- event: 出来事。when にはその出来事が作中のいつかを、分かる範囲の言葉で入れる。
- knowledge: ある時点で誰が何を知っている・知らないか。subject は知っている側の人物。
- setting: 舞台・世界の決まり。
- idea: 書き手のまだ使っていない思いつき。
推測で埋めず、資料に書かれていることだけを取り出してください。when が分からなければ null にしてください。";

#[derive(Deserialize, JsonSchema)]
struct Extraction {
    label: String,
    facts: Vec<Fact>,
}

fn ingest_system() -> String {
    format!(
        "あなたは二次創作の書き手を手伝う資料係です。渡された文章か URL の中身を読み、作品理解の資料にします。
URL なら WebFetch で読んでください。label には資料の短い名前を付けてください。
{FACT_GUIDE}"
    )
}

fn manuscript_system() -> String {
    format!(
        "あなたは小説の原稿を読む担当編集です。原稿の本文から、書き手が書いた事実を取り出します。
label には「{MANUSCRIPT_LABEL}」を入れてください。
{FACT_GUIDE}"
    )
}

pub async fn ingest_text(store: &Store, claude: &Claude, text: &str) -> Outcome<Source> {
    let extraction: Extraction = judge(claude, &ingest_system(), text, &WEB_TOOLS).await?;
    let label = utf16_slice(&extraction.label, 0, LABEL_LENGTH);
    let source = NewSource {
        label: &label,
        origin: SourceOrigin::Agent,
        client: BUILT_IN_AGENT,
        manuscript_id: None,
        facts: &extraction.facts,
    };
    store.with(|connection| sources::add(connection, &source))
}

pub async fn extract_manuscript(
    store: &Store,
    claude: &Claude,
    manuscript_id: &str,
    prose: &[String],
) -> Outcome<()> {
    if prose.is_empty() {
        return Ok(());
    }
    let extraction: Extraction =
        judge(claude, &manuscript_system(), &prose.join("\n"), &[]).await?;
    let source = NewSource {
        label: MANUSCRIPT_LABEL,
        origin: SourceOrigin::Manuscript,
        client: BUILT_IN_AGENT,
        manuscript_id: Some(manuscript_id),
        facts: &extraction.facts,
    };
    store.with(|connection| sources::replace_manuscript_source(connection, &source))?;
    Ok(())
}

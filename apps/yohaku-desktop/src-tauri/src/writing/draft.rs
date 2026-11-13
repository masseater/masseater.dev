use crate::failure::Outcome;
use crate::model::Paragraph;
use crate::store::sources::KnownFact;
use crate::text::utf16_slice;

use super::agent::write;
use super::claude::Claude;

const STYLE_RULES: &str = "守ること:
- 書き手のこれまでの本文の文体・人称・語彙・文の長さに合わせる。
- 感情を「嬉しかった」「胸が温かくなった」のように説明しない。動作・視線・台詞・間で見せる。
- 「〜のような」「まるで〜」の飾った比喩、「静寂」「紡ぐ」「刻む」のような大げさな語を使わない。
- 人物の口調は資料の voice に従う。資料にない設定を足さない。
- 出力は本文の文章だけにする。前置き・説明・かっこ書きの注釈を付けない。";

pub struct Context {
    pub paragraphs: Vec<Paragraph>,
    pub prose: Vec<String>,
    pub facts: Vec<KnownFact>,
}

pub struct Rewrite<'a> {
    pub paragraph: &'a Paragraph,
    pub from: usize,
    pub to: usize,
    pub problem: &'a str,
}

fn draft_system() -> String {
    format!(
        "あなたは書き手の代わりに小説の一節を書く書き手の分身です。
書き手が残したメモを、直前までの本文に続く本文にしてください。メモに書かれていないことは書き足さない。
{STYLE_RULES}"
    )
}

fn rewrite_system() -> String {
    format!(
        "あなたは書き手の文章を直す担当編集です。
指示された箇所だけを書き直し、置き換える文章だけを出力してください。前後の文はそのまま残るので繰り返さない。
{STYLE_RULES}"
    )
}

fn fact_line(fact: &KnownFact) -> String {
    let KnownFact {
        kind,
        subject,
        body,
        at,
        label,
    } = fact;
    at.as_ref().map_or_else(
        || format!("- [{kind}] {subject}: {body}（{label}）"),
        |when| format!("- [{kind}] {subject}（{when}）: {body}（{label}）"),
    )
}

fn facts_section(facts: &[KnownFact]) -> String {
    let lines: Vec<String> = facts.iter().map(fact_line).collect();
    format!("資料:\n{}", lines.join("\n"))
}

fn prose_before(context: &Context, paragraph_id: &str) -> String {
    context
        .paragraphs
        .iter()
        .take_while(|paragraph| paragraph.id != paragraph_id)
        .map(|paragraph| paragraph.text.as_str())
        .filter(|text| context.prose.iter().any(|prose| prose == text))
        .collect::<Vec<_>>()
        .join("\n")
}

pub async fn draft_from_memo(
    claude: &Claude,
    context: &Context,
    memo: &Paragraph,
    on_text: impl FnMut(String),
) -> Outcome<()> {
    let prompt = format!(
        "{}\n\n直前までの本文:\n{}\n\nメモ:\n{}",
        facts_section(&context.facts),
        prose_before(context, &memo.id),
        memo.text
    );
    write(claude, &draft_system(), &prompt, on_text).await
}

pub async fn rewrite_span(
    claude: &Claude,
    context: &Context,
    rewrite: &Rewrite<'_>,
    on_text: impl FnMut(String),
) -> Outcome<()> {
    let prompt = format!(
        "{}\n\n直前までの本文:\n{}\n\n段落:\n{}\n\n書き直す箇所（{}）:\n{}",
        facts_section(&context.facts),
        prose_before(context, &rewrite.paragraph.id),
        rewrite.paragraph.text,
        rewrite.problem,
        utf16_slice(&rewrite.paragraph.text, rewrite.from, rewrite.to)
    );
    write(claude, &rewrite_system(), &prompt, on_text).await
}

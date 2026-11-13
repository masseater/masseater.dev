use std::collections::HashMap;

use schemars::JsonSchema;
use serde::Deserialize;

use crate::failure::Outcome;
use crate::model::{Classified, Paragraph, ParagraphKind};
use crate::store::{Store, kinds};

use super::agent::judge;
use super::claude::Claude;

const SYSTEM: &str = "あなたは小説の原稿を読む担当編集です。書き手は本文・メモ・ネタを区別せず一枚の紙に書いています。
番号つきの行それぞれが次のどれかを判定してください。
- prose: 作品の本文として書かれた文。地の文や台詞。
- memo: これから書く場面の覚え書き。単語や短い句を並べた走り書き、展開の指示、「〜する？」のような自問。
- idea: この場面とは別の、いつか使いたい思いつき。
迷ったら prose にしてください。";

#[derive(Deserialize, JsonSchema)]
struct Judged {
    index: usize,
    kind: ParagraphKind,
}

#[derive(Deserialize, JsonSchema)]
struct Answer {
    kinds: Vec<Judged>,
}

fn prompt_of(texts: &[String]) -> String {
    texts
        .iter()
        .enumerate()
        .map(|(index, text)| format!("{index}: {text}"))
        .collect::<Vec<_>>()
        .join("\n")
}

async fn judge_kinds(claude: &Claude, texts: &[String]) -> Outcome<Vec<(String, ParagraphKind)>> {
    if texts.is_empty() {
        return Ok(Vec::new());
    }
    let answer: Answer = judge(claude, SYSTEM, &prompt_of(texts), &[]).await?;
    Ok(answer
        .kinds
        .into_iter()
        .filter_map(|judged| Some((texts.get(judged.index)?.clone(), judged.kind)))
        .collect())
}

fn written(paragraphs: &[Paragraph]) -> Vec<&Paragraph> {
    paragraphs
        .iter()
        .filter(|paragraph| !paragraph.text.trim().is_empty())
        .collect()
}

fn distinct_texts(written: &[&Paragraph]) -> Vec<String> {
    let mut texts: Vec<String> = Vec::new();
    for paragraph in written {
        if !texts.contains(&paragraph.text) {
            texts.push(paragraph.text.clone());
        }
    }
    texts
}

pub async fn classify(
    store: &Store,
    claude: &Claude,
    paragraphs: &[Paragraph],
) -> Outcome<Vec<Classified>> {
    let written = written(paragraphs);
    let texts = distinct_texts(&written);
    let mut known: HashMap<String, ParagraphKind> =
        store.with(|connection| kinds::known(connection, &texts))?;
    let unknown: Vec<String> = texts
        .into_iter()
        .filter(|text| !known.contains_key(text))
        .collect();
    let judged = judge_kinds(claude, &unknown).await?;
    store.with(|connection| kinds::remember(connection, &judged))?;
    known.extend(judged);
    Ok(written
        .into_iter()
        .filter_map(|paragraph| {
            Some(Classified {
                paragraph_id: paragraph.id.clone(),
                kind: *known.get(&paragraph.text)?,
            })
        })
        .collect())
}

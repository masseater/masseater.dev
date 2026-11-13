use std::collections::HashSet;
use std::sync::LazyLock;

use regex::Regex;

use crate::model::{Paragraph, Remark};
use crate::text::utf16_offset;

const EMOTION_EXPLAINED: &str = "emotion_explained";
const EMOTION_MESSAGE: &str = "感情の説明";
const CLICHE: &str = "ai_cliche";
const CLICHE_MESSAGE: &str = "AI の決まり文句";
const SIMILE: &str = "simile";
const SIMILE_MESSAGE: &str = "飾った比喩";

struct NovelRule {
    rule: &'static str,
    message: &'static str,
    pattern: Regex,
}

fn rule(rule: &'static str, message: &'static str, pattern: &str) -> NovelRule {
    NovelRule {
        rule,
        message,
        pattern: Regex::new(pattern).unwrap_or_else(|error| panic!("{rule}: {error}")),
    }
}

static NOVEL_RULES: LazyLock<Vec<NovelRule>> = LazyLock::new(|| {
    vec![
        rule(
            EMOTION_EXPLAINED,
            EMOTION_MESSAGE,
            r"(?:胸|心)(?:の(?:奥|中|底))?(?:が|は)[^。、]{0,12}(?:温か|あたたか|熱く|痛ん|苦しく|締め付け|ざわつ|躍っ|弾ん|満たさ)[^。]*。?",
        ),
        rule(
            EMOTION_EXPLAINED,
            EMOTION_MESSAGE,
            r"(?:嬉し|悲し|寂し|さみし|切な|悔し|愛おし|恥ずかし)(?:い|さ)(?:気持ち|思い|感情)[^。]*。?",
        ),
        rule(
            EMOTION_EXPLAINED,
            EMOTION_MESSAGE,
            r"[^。]*という(?:感情|気持ち)[^。]*。?",
        ),
        rule(
            EMOTION_EXPLAINED,
            EMOTION_MESSAGE,
            r"(?:喜び|悲しみ|寂しさ|怒り|不安|安堵)が(?:込み上げ|こみ上げ|湧き上が|広が|押し寄せ)[^。]*。?",
        ),
        rule(
            CLICHE,
            CLICHE_MESSAGE,
            r"静寂|紡(?:ぐ|いだ|がれ|ぎ出)|刻み込|どこか(?:寂しげ|懐かしげ|切なげ|遠く)|小さく息を(?:吐|つ)|口元を(?:綻ば|ほころば)|温もり|揺らめ|煌め|一筋の(?:涙|光)|優しく微笑",
        ),
        rule(
            SIMILE,
            SIMILE_MESSAGE,
            r"まるで[^。]{1,30}(?:よう|みたい)[^。]*。?",
        ),
    ]
});

fn utf16(text: &str, byte: usize) -> u32 {
    u32::try_from(utf16_offset(text, byte)).unwrap_or(u32::MAX)
}

fn remarks_in(paragraph: &Paragraph) -> impl Iterator<Item = Remark> + '_ {
    NOVEL_RULES.iter().flat_map(move |novel| {
        novel
            .pattern
            .find_iter(&paragraph.text)
            .map(move |found| Remark {
                paragraph_id: paragraph.id.clone(),
                from: utf16(&paragraph.text, found.start()),
                to: utf16(&paragraph.text, found.end()),
                rule: novel.rule.to_owned(),
                message: novel.message.to_owned(),
            })
    })
}

pub fn remarks_of(paragraphs: &[Paragraph]) -> Vec<Remark> {
    paragraphs.iter().flat_map(remarks_in).collect()
}

pub fn without_dismissed(
    remarks: Vec<Remark>,
    dismissed: &HashSet<(String, String)>,
    text_of: impl Fn(&str) -> String,
) -> Vec<Remark> {
    remarks
        .into_iter()
        .filter(|remark| !dismissed.contains(&(text_of(&remark.paragraph_id), remark.rule.clone())))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::remarks_of;
    use crate::model::Paragraph;
    use crate::text::utf16_slice;

    fn marked(text: &str) -> Vec<String> {
        let paragraph = Paragraph {
            id: "p".into(),
            text: text.into(),
        };
        remarks_of(&[paragraph])
            .into_iter()
            .map(|remark| {
                let from = remark.from as usize;
                let to = remark.to as usize;
                format!("{}:{}", remark.message, utf16_slice(text, from, to))
            })
            .collect()
    }

    #[test]
    fn points_at_only_the_cliche_words() {
        assert_eq!(
            marked("静寂が部屋を満たし、ヤチヨは小さく息を吐いた。"),
            ["AI の決まり文句:静寂", "AI の決まり文句:小さく息を吐"]
        );
    }

    #[test]
    fn points_at_the_sentence_that_explains_a_feeling() {
        assert_eq!(
            marked("鏡の中で、かぐやの顔が笑っていた。胸の奥がじんわりと温かくなった。"),
            ["感情の説明:胸の奥がじんわりと温かくなった。"]
        );
    }

    #[test]
    fn says_nothing_about_action_and_dialogue() {
        assert_eq!(
            marked("ヤチヨは保管庫の扉を開けた。棚の奥に箱があった。「……これ、まだあったんだ」"),
            [] as [&str; 0]
        );
    }
}

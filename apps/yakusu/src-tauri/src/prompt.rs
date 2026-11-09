use std::fmt;

use serde::{Deserialize, Serialize};

const TAG: &str = "<|plamo:tag|>";
const KEY: &str = "<|plamo:key|>";
const VAL: &str = "<|plamo:val|>";
const MSG: &str = "<|plamo:msg|>";
const RESERVED: &str = "<|plamo:";
const EASY_JAPANESE: &str = "ja(easy)";

/// Strings that end a translation in the PFML3 format.
pub const STOP: [&str; 2] = ["<|plamo:tag|>", "<|plamo:bos|>"];

/// A language code that the model accepts, such as `ja`, `en` or `zh-hans`.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub struct Lang(String);

/// The reason a value cannot go into a prompt.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Invalid {
    Lang(String),
    Reserved,
    FormOutsideJapanese,
}

impl fmt::Display for Invalid {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Lang(code) => write!(formatter, "{code} は言語コードではありません"),
            Self::Reserved => write!(formatter, "{RESERVED} を含む文は訳せません"),
            Self::FormOutsideJapanese => {
                write!(formatter, "文体は日本語に訳すときだけ選べます")
            }
        }
    }
}

impl std::error::Error for Invalid {}

impl TryFrom<String> for Lang {
    type Error = Invalid;

    fn try_from(code: String) -> Result<Self, Self::Error> {
        let is_lower = |part: &str| part.bytes().all(|byte| byte.is_ascii_lowercase());
        let valid = code == EASY_JAPANESE
            || match code.split('-').collect::<Vec<_>>().as_slice() {
                [language] => (2..=3).contains(&language.len()) && is_lower(language),
                [language, script] => {
                    (2..=3).contains(&language.len())
                        && is_lower(language)
                        && script.len() == 4
                        && is_lower(script)
                }
                _ => false,
            };
        if valid {
            Ok(Self(code))
        } else {
            Err(Invalid::Lang(code))
        }
    }
}

impl From<Lang> for String {
    fn from(lang: Lang) -> Self {
        lang.0
    }
}

impl Lang {
    fn is_japanese(&self) -> bool {
        self.0 == "ja"
    }
}

/// The style of a Japanese translation.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Form {
    Plain,
    Polite,
}

impl Form {
    const fn code(self) -> &'static str {
        match self {
            Self::Plain => "plain",
            Self::Polite => "polite",
        }
    }
}

/// What to translate from and into. Without a source language the model detects it.
#[derive(Clone, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Direction {
    pub source: Option<Lang>,
    pub target: Lang,
    pub form: Option<Form>,
}

/// A source text and the translation the model already gave for it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Pair {
    pub source: String,
    pub translation: String,
}

fn check(text: &str) -> Result<(), Invalid> {
    if text.contains(RESERVED) {
        Err(Invalid::Reserved)
    } else {
        Ok(())
    }
}

fn push_input(prompt: &mut String, direction: &Direction, text: &str) {
    prompt.push_str(TAG);
    prompt.push_str("input");
    if let Some(source) = &direction.source {
        prompt.push_str(KEY);
        prompt.push_str("lang");
        prompt.push_str(VAL);
        prompt.push_str(&source.0);
    }
    prompt.push_str(MSG);
    prompt.push_str(text);
}

fn push_output_header(prompt: &mut String, direction: &Direction) {
    prompt.push_str(TAG);
    prompt.push_str("output");
    prompt.push_str(KEY);
    prompt.push_str("lang");
    prompt.push_str(VAL);
    prompt.push_str(&direction.target.0);
}

/// Builds the PFML3 prompt that translates `text`, following the earlier pairs in `history`.
///
/// # Errors
///
/// Returns an error when a text contains a reserved PFML3 token, or when a form is given for a
/// language other than Japanese.
pub fn build(direction: &Direction, history: &[Pair], text: &str) -> Result<String, Invalid> {
    if direction.form.is_some() && !direction.target.is_japanese() {
        return Err(Invalid::FormOutsideJapanese);
    }
    check(text)?;
    let mut prompt = format!("{TAG}dataset{MSG}translation");
    for pair in history {
        check(&pair.source)?;
        check(&pair.translation)?;
        push_input(&mut prompt, direction, &pair.source);
        push_output_header(&mut prompt, direction);
        prompt.push_str(MSG);
        prompt.push_str(&pair.translation);
    }
    push_input(&mut prompt, direction, text);
    push_output_header(&mut prompt, direction);
    if let Some(form) = direction.form {
        prompt.push_str(KEY);
        prompt.push_str("form");
        prompt.push_str(VAL);
        prompt.push_str(form.code());
    }
    prompt.push_str(MSG);
    Ok(prompt)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lang(code: &str) -> Lang {
        Lang::try_from(code.to_owned()).unwrap()
    }

    fn direction(source: Option<&str>, target: &str, form: Option<Form>) -> Direction {
        Direction {
            source: source.map(lang),
            target: lang(target),
            form,
        }
    }

    #[test]
    fn builds_the_model_card_prompt_without_a_source_language() {
        assert_eq!(
            build(
                &direction(None, "en", None),
                &[],
                "会議は来週の月曜日に変更されました。"
            )
            .unwrap(),
            "<|plamo:tag|>dataset<|plamo:msg|>translation\
             <|plamo:tag|>input\
             <|plamo:msg|>会議は来週の月曜日に変更されました。\
             <|plamo:tag|>output<|plamo:key|>lang<|plamo:val|>en<|plamo:msg|>"
        );
    }

    #[test]
    fn builds_the_model_card_prompt_with_history() {
        let history = [
            Pair {
                source: "プロジェクトの管理画面を開きます。".to_owned(),
                translation: "Open the project dashboard.".to_owned(),
            },
            Pair {
                source: "進行中のタスクがすべて表示されます。".to_owned(),
                translation: "It lists all active tasks.".to_owned(),
            },
        ];
        assert_eq!(
            build(
                &direction(Some("ja"), "en", None),
                &history,
                "オーナーでフィルタリングすることもできます。"
            )
            .unwrap(),
            "<|plamo:tag|>dataset<|plamo:msg|>translation\
             <|plamo:tag|>input<|plamo:key|>lang<|plamo:val|>ja<|plamo:msg|>プロジェクトの管理画面を開きます。\
             <|plamo:tag|>output<|plamo:key|>lang<|plamo:val|>en<|plamo:msg|>Open the project dashboard.\
             <|plamo:tag|>input<|plamo:key|>lang<|plamo:val|>ja<|plamo:msg|>進行中のタスクがすべて表示されます。\
             <|plamo:tag|>output<|plamo:key|>lang<|plamo:val|>en<|plamo:msg|>It lists all active tasks.\
             <|plamo:tag|>input<|plamo:key|>lang<|plamo:val|>ja<|plamo:msg|>オーナーでフィルタリングすることもできます。\
             <|plamo:tag|>output<|plamo:key|>lang<|plamo:val|>en<|plamo:msg|>"
        );
    }

    #[test]
    fn puts_the_form_after_the_target_language() {
        assert_eq!(
            build(&direction(None, "ja", Some(Form::Polite)), &[], "Hi.").unwrap(),
            "<|plamo:tag|>dataset<|plamo:msg|>translation<|plamo:tag|>input<|plamo:msg|>Hi.\
             <|plamo:tag|>output<|plamo:key|>lang<|plamo:val|>ja<|plamo:key|>form<|plamo:val|>polite<|plamo:msg|>"
        );
    }

    #[test]
    fn rejects_a_form_outside_japanese() {
        assert_eq!(
            build(&direction(None, "en", Some(Form::Plain)), &[], "やあ。"),
            Err(Invalid::FormOutsideJapanese)
        );
    }

    #[test]
    fn rejects_reserved_tokens_in_the_source() {
        assert_eq!(
            build(&direction(None, "ja", None), &[], "a <|plamo:tag|> b"),
            Err(Invalid::Reserved)
        );
    }

    #[test]
    fn accepts_the_codes_the_model_card_lists() {
        for code in ["ja", "en", "zh-hans", "zh-hant", "ceb", "ja(easy)"] {
            assert!(Lang::try_from(code.to_owned()).is_ok(), "{code}");
        }
    }

    #[test]
    fn rejects_codes_outside_the_template_rules() {
        for code in ["", "EN", "en-US", "zh-han", "e", "english", "zh-hans-x"] {
            assert!(Lang::try_from(code.to_owned()).is_err(), "{code}");
        }
    }
}

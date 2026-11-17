use std::borrow::Cow;
use std::sync::LazyLock;

use lindera::dictionary::load_dictionary;
use lindera::mode::Mode;
use lindera::segmenter::Segmenter;
use serde::Serialize;

const DICTIONARY: &str = "embedded://ipadic";
const KNOWN: &str = "KNOWN";
const UNKNOWN: &str = "UNKNOWN";
const NONE: &str = "*";

static SEGMENTER: LazyLock<Segmenter> = LazyLock::new(|| {
    let _span = tracing::info_span!("y8.load_dictionary", "y8.dictionary" = DICTIONARY).entered();
    let dictionary = load_dictionary(DICTIONARY).expect("the embedded IPADIC dictionary loads");
    Segmenter::new(Mode::Normal, dictionary, None).keep_whitespace(true)
});

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Morpheme {
    pub word_id: u32,
    pub word_type: &'static str,
    pub surface_form: String,
    pub pos: String,
    pub pos_detail_1: String,
    pub pos_detail_2: String,
    pub pos_detail_3: String,
    pub conjugated_type: String,
    pub conjugated_form: String,
    pub basic_form: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reading: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pronunciation: Option<String>,
    pub word_position: usize,
}

fn field(details: &[&str], index: usize) -> String {
    details.get(index).copied().unwrap_or(NONE).to_owned()
}

fn spoken(details: &[&str], index: usize, known: bool) -> Option<String> {
    known.then(|| field(details, index))
}

fn morpheme(
    surface: String,
    details: &[&str],
    word_id: u32,
    known: bool,
    word_position: usize,
) -> Morpheme {
    Morpheme {
        word_id,
        word_type: if known { KNOWN } else { UNKNOWN },
        surface_form: surface,
        pos: field(details, 0),
        pos_detail_1: field(details, 1),
        pos_detail_2: field(details, 2),
        pos_detail_3: field(details, 3),
        conjugated_type: field(details, 4),
        conjugated_form: field(details, 5),
        basic_form: field(details, 6),
        reading: spoken(details, 7, known),
        pronunciation: spoken(details, 8, known),
        word_position,
    }
}

#[must_use]
pub fn tokenize(text: &str) -> Vec<Morpheme> {
    let Ok(mut tokens) = SEGMENTER.segment(Cow::Borrowed(text)) else {
        return Vec::new();
    };
    let mut position = 1;
    let mut offset = 0;
    tokens
        .iter_mut()
        .map(|token| {
            position += text[offset..token.byte_start].encode_utf16().count();
            offset = token.byte_start;
            let surface = token.surface.to_string();
            let word_id = token.word_id.id();
            let known = !token.word_id.is_unknown();
            let details = token.details();
            morpheme(surface, &details, word_id, known, position)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::tokenize;

    #[test]
    fn matches_kuromoji_for_known_words() {
        let tokens = tokenize("すもももももももものうち");
        let surfaces: Vec<&str> = tokens
            .iter()
            .map(|token| token.surface_form.as_str())
            .collect();
        assert_eq!(
            surfaces,
            ["すもも", "も", "もも", "も", "もも", "の", "うち"]
        );
        assert_eq!(tokens[1].pos, "助詞");
        assert_eq!(tokens[1].pos_detail_1, "係助詞");
        assert_eq!(tokens[0].reading.as_deref(), Some("スモモ"));
        assert_eq!(tokens[1].word_position, 4);
        assert_eq!(tokens[2].word_position, 5);
    }

    #[test]
    fn counts_positions_in_utf16_units_and_keeps_spaces() {
        let tokens = tokenize("🍣 を食べる");
        assert_eq!(tokens[1].surface_form, " ");
        assert_eq!(tokens[1].pos_detail_1, "空白");
        assert_eq!(tokens[2].word_position, 4);
    }

    #[test]
    fn leaves_readings_out_of_unknown_words() {
        let tokens = tokenize("masseater");
        assert_eq!(tokens[0].word_type, "UNKNOWN");
        assert_eq!(tokens[0].reading, None);
        assert_eq!(tokens[0].basic_form, "*");
    }
}

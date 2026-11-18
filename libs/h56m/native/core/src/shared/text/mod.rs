use std::collections::HashSet;
use std::io::Read;
use std::sync::LazyLock;

use anyhow::Result;
use base64::Engine;
use tiktoken_rs::CoreBPE;

static WORDS: LazyLock<HashSet<String>> = LazyLock::new(|| {
    let mut text = String::new();
    flate2::read::GzDecoder::new(&include_bytes!("../../../assets/words.txt.gz")[..])
        .read_to_string(&mut text)
        .expect("embedded word list");
    text.lines()
        .filter(|w| !w.is_empty())
        .map(str::to_owned)
        .collect()
});

static TOKENIZER: LazyLock<CoreBPE> = LazyLock::new(|| tiktoken_rs::cl100k_base().expect("cl100k"));

pub fn entropy(s: &str) -> f64 {
    if s.is_empty() {
        return 0.0;
    }
    let mut freq = [0u32; 256];
    for b in s.bytes() {
        freq[usize::from(b)] += 1;
    }
    let n = s.len() as f64;
    freq.iter()
        .filter(|f| **f > 0)
        .map(|f| {
            let p = f64::from(*f) / n;
            -p * p.log2()
        })
        .sum()
}

fn analyzed(secret: &str) -> String {
    if secret.len() < 20 && secret.contains(['\n', '\r']) {
        secret.replace(['\n', '\r'], "")
    } else {
        secret.to_owned()
    }
}

fn ratio_of(analyzed: &str) -> Option<f64> {
    let tokens = TOKENIZER.encode_ordinary(analyzed).len();
    (tokens > 0).then(|| analyzed.len() as f64 / tokens as f64)
}

pub fn token_ratio(secret: &str) -> f64 {
    ratio_of(&analyzed(secret)).unwrap_or(0.0)
}

pub fn contains_word(text: &str, min_len: usize) -> bool {
    let text = text.to_lowercase();
    let bytes = text.len();
    if bytes < min_len {
        return false;
    }
    (0..=bytes - min_len).any(|start| {
        (start + min_len..=bytes).any(|end| text.get(start..end).is_some_and(|s| WORDS.contains(s)))
    })
}

pub fn fails_token_efficiency(secret: &str) -> bool {
    let analyzed = analyzed(secret);
    let Some(ratio) = ratio_of(&analyzed) else {
        return false;
    };
    if contains_word(&analyzed, 5) {
        return true;
    }
    let threshold = if analyzed.len() < 12 && contains_word(&analyzed, 4) {
        2.1
    } else {
        2.5
    };
    ratio >= threshold
}

pub fn from_base64(s: &str) -> Result<Vec<u8>> {
    Ok(base64::engine::general_purpose::STANDARD.decode(s)?)
}

pub fn go_regex(pattern: &str) -> String {
    let chars: Vec<char> = pattern.chars().collect();
    let mut out = String::with_capacity(pattern.len());
    let mut i = 0;
    let mut class = false;
    while i < chars.len() {
        let c = chars[i];
        if c == '\\' && i + 1 < chars.len() {
            let next = chars[i + 1];
            if let Some(ascii) = perl_class(next, class) {
                out.push_str(ascii);
            } else {
                out.push(c);
                out.push(next);
            }
            i += 2;
            continue;
        }
        if class {
            if c == ']' {
                class = false;
            }
            out.push(c);
            i += 1;
            continue;
        }
        if c == '[' {
            class = true;
            out.push(c);
            i += 1;
            if i < chars.len() && chars[i] == '^' {
                out.push('^');
                i += 1;
            }
            if i < chars.len() && chars[i] == ']' {
                out.push(']');
                i += 1;
            }
            continue;
        }
        if c == '{' {
            let rest: String = chars[i + 1..].iter().take(24).collect();
            let valid = rest.find('}').is_some_and(|end| {
                let inner = &rest[..end];
                let mut parts = inner.splitn(2, ',');
                let first = parts.next().unwrap_or("");
                !first.is_empty()
                    && first.chars().all(|d| d.is_ascii_digit())
                    && parts
                        .next()
                        .is_none_or(|second| second.chars().all(|d| d.is_ascii_digit()))
            });
            out.push_str(if valid { "{" } else { "\\{" });
            i += 1;
            continue;
        }
        out.push(c);
        i += 1;
    }
    out
}

fn perl_class(c: char, in_class: bool) -> Option<&'static str> {
    Some(match (c, in_class) {
        ('d', false) => "[[:digit:]]",
        ('d', true) => "[:digit:]",
        ('D', false) => "[[:^digit:]]",
        ('D', true) => "[:^digit:]",
        ('w', false) => "[[:word:]]",
        ('w', true) => "[:word:]",
        ('W', false) => "[[:^word:]]",
        ('W', true) => "[:^word:]",
        ('s', false) => "[\\t\\n\\f\\r ]",
        ('s', true) => "\\t\\n\\f\\r ",
        ('S', _) => "[^\\t\\n\\f\\r ]",
        ('b', false) => "(?-u:\\b)",
        ('B', false) => "(?-u:\\B)",
        _ => return None,
    })
}

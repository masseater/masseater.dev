use std::sync::LazyLock;

use regex::Regex;

static UNICODE_PUNCTUATION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[\p{P}\p{S}]$").expect("punctuation"));

fn is_unicode_punctuation(c: char) -> bool {
    if c.is_ascii() {
        return c.is_ascii_punctuation();
    }
    let mut buffer = [0u8; 4];
    UNICODE_PUNCTUATION.is_match(c.encode_utf8(&mut buffer))
}

fn is_space(c: Option<char>) -> bool {
    c.is_none_or(|c| matches!(c, '\t' | '\n' | '\r' | ' ') || c.is_whitespace())
}

fn is_atext(c: char) -> bool {
    matches!(c, '+' | '-' | '.' | '_') || c.is_ascii_alphanumeric()
}

struct Scanner<'a> {
    chars: &'a [(usize, char)],
}

impl Scanner<'_> {
    fn at(&self, index: usize) -> Option<char> {
        self.chars.get(index).map(|&(_, c)| c)
    }

    fn trail(&self, mut index: usize) -> bool {
        loop {
            match self.at(index) {
                Some('!' | '"' | '\'' | ')' | '*' | ',' | '.' | ':' | ';' | '?' | '_' | '~') => {
                    index += 1;
                }
                Some('&') => {
                    index += 1;
                    if !self.at(index).is_some_and(|c| c.is_ascii_alphabetic()) {
                        return false;
                    }
                    while self.at(index).is_some_and(|c| c.is_ascii_alphabetic()) {
                        index += 1;
                    }
                    if self.at(index) != Some(';') {
                        return false;
                    }
                    index += 1;
                }
                Some(']') => {
                    index += 1;
                    let next = self.at(index);
                    if matches!(next, Some('(' | '[')) || is_space(next) {
                        return true;
                    }
                }
                Some('<') => return true,
                c if is_space(c) => return true,
                _ => return false,
            }
        }
    }

    fn domain(&self, mut index: usize) -> Option<usize> {
        let mut seen = false;
        let mut underscore_last = false;
        let mut underscore_last_last = false;
        loop {
            let c = self.at(index);
            match c {
                Some('.' | '_') => {
                    if self.trail(index) {
                        break;
                    }
                    if c == Some('_') {
                        underscore_last = true;
                    } else {
                        underscore_last_last = underscore_last;
                        underscore_last = false;
                    }
                    index += 1;
                }
                None => break,
                Some(ch) if is_space(c) || (ch != '-' && is_unicode_punctuation(ch)) => break,
                Some(_) => {
                    seen = true;
                    index += 1;
                }
            }
        }
        (!underscore_last_last && !underscore_last && seen).then_some(index)
    }

    fn path(&self, mut index: usize) -> usize {
        let mut open = 0;
        let mut close = 0;
        loop {
            let c = self.at(index);
            match c {
                Some('(') => {
                    open += 1;
                    index += 1;
                }
                Some(')') if close < open => {
                    close += 1;
                    index += 1;
                }
                Some(
                    '!' | '"' | '&' | '\'' | ')' | '*' | ',' | '.' | ':' | ';' | '<' | '?' | ']'
                    | '_' | '~',
                ) => {
                    if self.trail(index) {
                        return index;
                    }
                    if c == Some(')') {
                        close += 1;
                    }
                    index += 1;
                }
                None => return index,
                Some(_) if is_space(c) => return index,
                Some(_) => index += 1,
            }
        }
    }

    fn email(&self, start: usize) -> Option<usize> {
        let mut index = start;
        while self.at(index).is_some_and(is_atext) {
            index += 1;
        }
        if index == start || self.at(index) != Some('@') {
            return None;
        }
        index += 1;
        let mut data = false;
        let mut dot = false;
        loop {
            match self.at(index) {
                Some('.') => {
                    if self
                        .at(index + 1)
                        .is_some_and(|c| c.is_ascii_alphanumeric())
                    {
                        dot = true;
                        index += 1;
                    } else {
                        break;
                    }
                }
                Some(c) if c == '-' || c == '_' || c.is_ascii_alphanumeric() => {
                    data = true;
                    index += 1;
                }
                _ => break,
            }
        }
        let previous = self.at(index - 1);
        (data && dot && previous.is_some_and(|c| c.is_ascii_alphabetic())).then_some(index)
    }

    fn www(&self, start: usize) -> Option<usize> {
        let prefix: String = (start..start + 4).filter_map(|i| self.at(i)).collect();
        if !prefix.eq_ignore_ascii_case("www.") || self.at(start + 4).is_none() {
            return None;
        }
        let end = self.domain(start)?;
        Some(self.path(end))
    }

    fn protocol(&self, start: usize) -> Option<usize> {
        let mut index = start;
        while index - start < 5 && self.at(index).is_some_and(|c| c.is_ascii_alphabetic()) {
            index += 1;
        }
        let scheme: String = (start..index)
            .filter_map(|i| self.at(i))
            .collect::<String>()
            .to_lowercase();
        if self.at(index) != Some(':') || (scheme != "http" && scheme != "https") {
            return None;
        }
        index += 1;
        if self.at(index) != Some('/') || self.at(index + 1) != Some('/') {
            return None;
        }
        index += 2;
        let c = self.at(index)?;
        if c.is_ascii_control() || is_space(Some(c)) || is_unicode_punctuation(c) {
            return None;
        }
        let end = self.domain(index)?;
        Some(self.path(end))
    }
}

#[must_use]
pub fn literal_autolinks(
    source: &str,
    start: usize,
    end: usize,
    blocked: impl Fn(usize) -> bool,
) -> Vec<(usize, usize)> {
    let bytes = &source.as_bytes()[start..end];
    if !bytes.contains(&b'@')
        && !bytes.windows(3).any(|w| w == b"://")
        && !bytes.windows(4).any(|w| w.eq_ignore_ascii_case(b"www."))
    {
        return Vec::new();
    }
    let chars: Vec<(usize, char)> = source[start..end]
        .char_indices()
        .map(|(i, c)| (start + i, c))
        .collect();
    let scanner = Scanner { chars: &chars };
    let offset = |index: usize| chars.get(index).map_or(end, |&(i, _)| i);
    let mut found = Vec::new();
    let mut index = 0;
    while index < chars.len() {
        let (at, c) = chars[index];
        let previous = if index == 0 {
            source[..start].chars().next_back()
        } else {
            Some(chars[index - 1].1)
        };
        let mut result = None;
        if is_atext(c) && !previous.is_some_and(|p| p == '/' || is_atext(p)) {
            result = scanner.email(index);
        }
        if result.is_none()
            && matches!(c, 'h' | 'H')
            && !previous.is_some_and(|p| p.is_ascii_alphabetic())
        {
            result = scanner.protocol(index);
        }
        if result.is_none()
            && matches!(c, 'w' | 'W')
            && (previous.is_none()
                || matches!(previous, Some('(' | '*' | '_' | '[' | ']' | '~'))
                || is_space(previous))
        {
            result = scanner.www(index);
        }
        match result {
            Some(stop) if stop > index && !blocked(at) => {
                found.push((at, offset(stop)));
                index = stop;
            }
            _ => index += 1,
        }
    }
    found
}

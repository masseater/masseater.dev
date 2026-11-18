use std::rc::Rc;

use base64::Engine;
use base64::alphabet;
use base64::engine::{DecodePaddingMode, GeneralPurpose, GeneralPurposeConfig};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Range {
    pub start: usize,
    pub end: usize,
}

impl Range {
    fn overlaps(self, o: Range) -> bool {
        o.start <= self.end && o.end >= self.start
    }

    fn contains(self, o: Range) -> bool {
        self.start <= o.start && o.end <= self.end
    }

    fn merge(self, o: Range) -> Range {
        Range {
            start: self.start.min(o.start),
            end: self.end.max(o.end),
        }
    }

    fn shift(self, by: (isize, isize)) -> Range {
        Range {
            start: (self.start as isize + by.0).max(0) as usize,
            end: (self.end as isize + by.1).max(0) as usize,
        }
    }

    fn overflow(self, o: Range) -> (isize, isize) {
        let m = self.merge(o);
        (
            m.start as isize - self.start as isize,
            m.end as isize - self.end as isize,
        )
    }
}

#[derive(Debug)]
pub struct Segment {
    predecessors: Vec<Rc<Segment>>,
    original: Range,
    encoded: Range,
    decoded: Range,
    pub encodings: u8,
    pub depth: usize,
}

const PERCENT: u8 = 1;
const UNICODE: u8 = 2;
const HEX: u8 = 4;
const BASE64: u8 = 8;

fn precedence(kind: u8) -> u8 {
    match kind {
        PERCENT => 4,
        UNICODE => 3,
        HEX => 2,
        _ => 1,
    }
}

fn is_hex(c: u8) -> bool {
    c.is_ascii_hexdigit()
}

fn is_b64(c: u8) -> bool {
    c.is_ascii_alphanumeric() || matches!(c, b'_' | b'/' | b'+' | b'-')
}

fn is_space(c: u8) -> bool {
    matches!(c, b' ' | b'\t' | b'\n' | b'\r' | 0x0c | 0x0b)
}

fn printable(b: u8) -> bool {
    b > 0x08 && b < 0x7f
}

fn hex_value(c: u8) -> Option<u8> {
    (c as char).to_digit(16).map(|d| d as u8)
}

fn unicode_escape(d: &[u8], j: usize) -> Option<usize> {
    let n = d.len();
    if j + 6 < n
        && d[j] == b'\\'
        && d[j + 1] == b'\\'
        && matches!(d[j + 2], b'u' | b'U')
        && d[j + 3..j + 7].iter().all(|c| is_hex(*c))
    {
        return Some(j + 7);
    }
    if j + 5 < n
        && d[j] == b'\\'
        && matches!(d[j + 1], b'u' | b'U')
        && d[j + 2..j + 6].iter().all(|c| is_hex(*c))
    {
        return Some(j + 6);
    }
    None
}

fn code_point_at(d: &[u8], j: usize) -> bool {
    j + 5 < d.len()
        && d[j] == b'U'
        && d[j + 1] == b'+'
        && d[j + 2..j + 6].iter().all(|c| is_hex(*c))
}

fn encoded_run(d: &[u8], start: usize) -> (usize, Option<(u8, Range)>) {
    let n = d.len();
    let mut i = start + 1;
    let mut all_hex = is_hex(d[start]);
    if all_hex {
        while i < n && is_hex(d[i]) {
            i += 1;
        }
    }
    if i < n && is_b64(d[i]) {
        all_hex = false;
        while i < n && is_b64(d[i]) {
            i += 1;
        }
    }
    let run = i - start;
    let mut end = i;
    let mut eq = 0;
    while eq < 2 && end < n && d[end] == b'=' {
        eq += 1;
        end += 1;
    }
    let found = if all_hex && run >= 32 {
        Some((
            HEX,
            Range {
                start,
                end: start + run,
            },
        ))
    } else if run >= 16 && possible_base64_prefix(&d[start..end]) {
        Some((BASE64, Range { start, end }))
    } else {
        None
    };
    (i, found)
}

fn find_matches(data: &str) -> Vec<(u8, Range)> {
    let d = data.as_bytes();
    let n = d.len();
    let mut all = Vec::new();
    let mut i = 0;
    while i < n {
        let c = d[i];
        if c == b'%' && i + 2 < n && is_hex(d[i + 1]) && is_hex(d[i + 2]) {
            let start = i;
            let mut last = i + 3;
            let mut j = i + 3;
            while j < n && d[j] != b'\n' {
                if d[j] == b'%' && j + 2 < n && is_hex(d[j + 1]) && is_hex(d[j + 2]) {
                    last = j + 3;
                }
                j += 1;
            }
            all.push((PERCENT, Range { start, end: last }));
            i = last;
            continue;
        }
        if c == b'U' && code_point_at(d, i) {
            let after = i + 6;
            if after >= n || is_space(d[after]) {
                let start = i;
                let mut end = after;
                let mut j = after;
                while j < n && is_space(d[j]) {
                    let mut ws = j;
                    while ws < n && is_space(d[ws]) {
                        ws += 1;
                    }
                    if code_point_at(d, ws) && (ws + 6 >= n || is_space(d[ws + 6])) {
                        end = ws + 6;
                        j = end;
                        continue;
                    }
                    break;
                }
                all.push((UNICODE, Range { start, end }));
                i = end;
                continue;
            }
        }
        if c == b'\\' {
            let first = if i + 7 < n
                && d[i + 1] == b'\\'
                && matches!(d[i + 2], b'u' | b'U')
                && d[i + 3..i + 7].iter().all(|c| is_hex(*c))
            {
                Some(i + 7)
            } else if i + 5 < n
                && matches!(d[i + 1], b'u' | b'U')
                && d[i + 2..i + 6].iter().all(|c| is_hex(*c))
            {
                Some(i + 6)
            } else {
                None
            };
            if let Some(mut end) = first {
                while let Some(next) = unicode_escape(d, end) {
                    end = next;
                }
                all.push((UNICODE, Range { start: i, end }));
                i = end;
                continue;
            }
        }
        if is_b64(c) {
            let (next, found) = encoded_run(d, i);
            all.extend(found);
            i = next;
            continue;
        }
        i += 1;
    }
    by_precedence(&all)
}

fn by_precedence(all: &[(u8, Range)]) -> Vec<(u8, Range)> {
    if all.len() <= 1 {
        return all.to_vec();
    }
    let mut filtered = Vec::with_capacity(all.len());
    for (i, m) in all.iter().enumerate() {
        if i > 0 {
            let prev = all[i - 1];
            if m.1.overlaps(prev.1) && precedence(prev.0) > precedence(m.0) {
                continue;
            }
        }
        if let Some(next) = all.get(i + 1)
            && m.1.overlaps(next.1)
            && precedence(next.0) > precedence(m.0)
        {
            continue;
        }
        filtered.push(*m);
    }
    filtered
}

fn b64_value(c: u8) -> u8 {
    match c {
        b'A'..=b'Z' => c - b'A',
        b'a'..=b'z' => c - b'a' + 26,
        b'0'..=b'9' => c - b'0' + 52,
        b'+' | b'-' => 62,
        b'/' | b'_' => 63,
        _ => 0xff,
    }
}

fn possible_base64_prefix(v: &[u8]) -> bool {
    if v.len() < 4 {
        return true;
    }
    let (a, b, c, d) = (
        b64_value(v[0]),
        b64_value(v[1]),
        b64_value(v[2]),
        b64_value(v[3]),
    );
    if a | b | c | d == 0xff {
        return true;
    }
    printable(a << 2 | b >> 4) && printable(b << 4 | c >> 2) && printable(c << 6 | d)
}

fn engines() -> [GeneralPurpose; 4] {
    let padded = GeneralPurposeConfig::new()
        .with_decode_allow_trailing_bits(true)
        .with_decode_padding_mode(DecodePaddingMode::RequireCanonical);
    let raw = GeneralPurposeConfig::new()
        .with_decode_allow_trailing_bits(true)
        .with_decode_padding_mode(DecodePaddingMode::RequireNone);
    [
        GeneralPurpose::new(&alphabet::STANDARD, padded),
        GeneralPurpose::new(&alphabet::URL_SAFE, raw),
        GeneralPurpose::new(&alphabet::STANDARD, raw),
        GeneralPurpose::new(&alphabet::URL_SAFE, padded),
    ]
}

fn decode_base64(v: &str) -> String {
    if !v
        .bytes()
        .any(|c| c.is_ascii_digit() || matches!(c, b'+' | b'/' | b'-' | b'_'))
    {
        return String::new();
    }
    for engine in engines() {
        if let Ok(out) = engine.decode(v)
            && out.iter().all(|b| printable(*b))
        {
            return String::from_utf8(out).unwrap_or_default();
        }
    }
    String::new()
}

fn decode_hex(v: &str) -> String {
    let b = v.as_bytes();
    if !b.len().is_multiple_of(2) || !b.iter().any(u8::is_ascii_digit) {
        return String::new();
    }
    let mut out = Vec::with_capacity(b.len() / 2);
    for pair in b.chunks(2) {
        let (Some(x), Some(y)) = (hex_value(pair[0]), hex_value(pair[1])) else {
            return String::new();
        };
        let byte = x << 4 | y;
        if !printable(byte) {
            return String::new();
        }
        out.push(byte);
    }
    String::from_utf8(out).unwrap_or_default()
}

fn decode_percent(v: &str) -> String {
    let b = v.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%'
            && i + 2 < b.len()
            && let (Some(x), Some(y)) = (hex_value(b[i + 1]), hex_value(b[i + 2]))
        {
            let byte = x << 4 | y;
            if !printable(byte) {
                return String::new();
            }
            out.push(byte);
            i += 3;
            continue;
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8(out).unwrap_or_default()
}

fn hex4(b: &[u8], at: usize) -> Option<char> {
    let s = std::str::from_utf8(b.get(at..at + 4)?).ok()?;
    Some(char::from_u32(u32::from_str_radix(s, 16).ok()?).unwrap_or('\u{fffd}'))
}

fn decode_unicode(v: &str) -> String {
    let b = v.as_bytes();
    let n = b.len();
    let mut out = String::with_capacity(n);
    let mut i = 0;
    let mut pending: Vec<u8> = Vec::new();
    let flush = |pending: &mut Vec<u8>, out: &mut String| {
        out.push_str(&String::from_utf8_lossy(pending));
        pending.clear();
    };
    if v.contains("U+") {
        while i < n {
            if i + 5 < n
                && b[i] == b'U'
                && b[i + 1] == b'+'
                && let Some(r) = hex4(b, i + 2)
            {
                flush(&mut pending, &mut out);
                out.push(r);
                i += 6;
                if i < n
                    && (b[i] == b' ' || b[i] == b'\t')
                    && i + 6 < n
                    && b[i + 1] == b'U'
                    && b[i + 2] == b'+'
                {
                    i += 1;
                }
                continue;
            }
            pending.push(b[i]);
            i += 1;
        }
    } else if v.contains("\\u") || v.contains("\\U") {
        while i < n {
            if b[i] == b'\\' {
                if i + 6 < n
                    && b[i + 1] == b'\\'
                    && matches!(b[i + 2], b'u' | b'U')
                    && let Some(r) = hex4(b, i + 3)
                {
                    flush(&mut pending, &mut out);
                    out.push(r);
                    i += 7;
                    continue;
                }
                if i + 5 < n
                    && matches!(b[i + 1], b'u' | b'U')
                    && let Some(r) = hex4(b, i + 2)
                {
                    flush(&mut pending, &mut out);
                    out.push(r);
                    i += 6;
                    continue;
                }
            }
            pending.push(b[i]);
            i += 1;
        }
    } else {
        return v.to_owned();
    }
    flush(&mut pending, &mut out);
    out
}

fn decode_one(kind: u8, v: &str) -> String {
    match kind {
        PERCENT => decode_percent(v),
        UNICODE => decode_unicode(v),
        HEX => decode_hex(v),
        _ => decode_base64(v),
    }
}

pub fn decode(data: &str, predecessors: &[Rc<Segment>]) -> (String, Vec<Rc<Segment>>) {
    let mut segments: Vec<Rc<Segment>> = Vec::new();
    let mut values: Vec<String> = Vec::new();
    let mut shift: isize = 0;
    for (kind, range) in find_matches(data) {
        let value = decode_one(kind, &data[range.start..range.end]);
        if value.is_empty() {
            continue;
        }
        let start = (range.start as isize + shift) as usize;
        let mut encodings = kind;
        let mut depth = 1;
        if let Some(first) = predecessors.first() {
            depth = 1 + first.depth;
            for p in predecessors {
                if range.overlaps(p.decoded) {
                    encodings |= p.encodings;
                }
            }
        }
        shift += value.len() as isize - (range.end - range.start) as isize;
        segments.push(Rc::new(Segment {
            predecessors: predecessors.to_vec(),
            original: to_original(predecessors, range),
            encoded: range,
            decoded: Range {
                start,
                end: start + value.len(),
            },
            encodings,
            depth,
        }));
        values.push(value);
    }
    if segments.is_empty() {
        return (data.to_owned(), segments);
    }
    let mut out = String::with_capacity(data.len());
    let mut at = 0;
    for (segment, value) in segments.iter().zip(&values) {
        out.push_str(&data[at..segment.encoded.start]);
        out.push_str(value);
        at = segment.encoded.end;
    }
    out.push_str(&data[at..]);
    (out, segments)
}

pub fn to_original(predecessors: &[Rc<Segment>], decoded: Range) -> Range {
    if predecessors.is_empty() {
        return decoded;
    }
    let mut encoded: Option<Range> = None;
    for p in predecessors {
        if !p.decoded.overlaps(decoded) {
            continue;
        }
        if p.decoded.contains(decoded) {
            return p.original;
        }
        let part = p.encoded.shift(p.decoded.overflow(decoded));
        encoded = Some(encoded.map_or(part, |e| e.merge(part)));
    }
    match encoded {
        None => decoded,
        Some(e) => to_original(&predecessors[0].predecessors, e),
    }
}

pub fn overlapping(segments: &[Rc<Segment>], start: usize, end: usize) -> Vec<Rc<Segment>> {
    let r = Range { start, end };
    segments
        .iter()
        .filter(|s| s.decoded.overlaps(r))
        .cloned()
        .collect()
}

pub fn current_line(segments: &[Rc<Segment>], current: &str) -> String {
    let b = current.as_bytes();
    let mut decoded = segments[0].decoded;
    for s in &segments[1..] {
        decoded = decoded.merge(s.decoded);
    }
    let mut start = 0;
    let mut end = b.len();
    let mut i = decoded.start.min(b.len().saturating_sub(1)) as isize;
    while i > -1 {
        if b[i as usize] == b'\n' {
            start = i as usize;
            break;
        }
        i -= 1;
    }
    for (j, c) in b.iter().enumerate().skip(decoded.end) {
        if *c == b'\n' {
            end = j;
            break;
        }
    }
    String::from_utf8_lossy(&b[start..end]).into_owned()
}

#[cfg(test)]
mod tests {
    use super::{Range, decode, to_original};

    const SECRET: &str = concat!("sk", "_live_", "abcdefghijklmnop");

    fn hex(text: &str) -> String {
        text.bytes()
            .map(|b| format!("{b:02x}"))
            .collect::<Vec<_>>()
            .concat()
    }

    #[test]
    fn decodes_each_encoding_once_per_pass() {
        let percent: String = SECRET
            .bytes()
            .map(|b| format!("%{b:02X}"))
            .collect::<Vec<_>>()
            .concat();
        let unicode: String = SECRET
            .chars()
            .map(|c| format!("\\u{:04x}", c as u32))
            .collect::<Vec<_>>()
            .concat();
        for encoded in [hex(SECRET), percent, unicode] {
            let (decoded, segments) = decode(&format!("k: {encoded}\n"), &[]);
            assert_eq!(decoded, format!("k: {SECRET}\n"), "{encoded}");
            assert_eq!(segments.len(), 1);
            assert_eq!(segments[0].depth, 1);
        }
    }

    #[test]
    fn maps_a_nested_match_back_to_the_original_bytes() {
        let inner = base64_of(&format!("x={SECRET}"));
        let outer = base64_of(&inner);
        let text = format!("v: {outer}\n");
        let (once, first) = decode(&text, &[]);
        let (twice, second) = decode(&once, &first);
        assert_eq!(second[0].depth, 2);
        let start = twice.find(SECRET).unwrap();
        let near: Vec<_> = second.clone();
        let original = to_original(
            &near,
            Range {
                start,
                end: start + SECRET.len(),
            },
        );
        assert_eq!(
            original,
            Range {
                start: 3,
                end: 3 + outer.len()
            }
        );
    }

    #[test]
    fn leaves_text_without_encodings_alone() {
        let (decoded, segments) = decode("plain words only\n", &[]);
        assert_eq!(decoded, "plain words only\n");
        assert!(segments.is_empty());
    }

    fn base64_of(text: &str) -> String {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD.encode(text)
    }
}

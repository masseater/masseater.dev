use regex_syntax::hir::{Class, Hir, HirKind};

const UTF_MAX: i64 = 4;
const LIMIT: i64 = 1 << 20;

#[derive(Debug, Clone)]
pub enum Node {
    Lit(Vec<char>, bool),
    Class(Vec<(u32, u32)>),
    Empty,
    Capture(Box<Node>),
    Repeat(u32, Option<u32>, Box<Node>),
    Concat(Vec<Node>),
    Alt(Vec<Node>),
}

fn fold_letter(ranges: &[(u32, u32)]) -> Option<char> {
    let mut members = Vec::new();
    for (a, b) in ranges {
        if b - a > 3 {
            return None;
        }
        for r in *a..=*b {
            members.push(r);
        }
    }
    let ascii: Vec<u32> = members.iter().copied().filter(|r| *r < 128).collect();
    let [x, y] = ascii[..] else { return None };
    let (x, y) = (char::from_u32(x)?, char::from_u32(y)?);
    if !x.is_ascii_alphabetic() || !x.eq_ignore_ascii_case(&y) || x == y {
        return None;
    }
    let lower = x.to_ascii_lowercase();
    let extra_ok = members
        .iter()
        .filter(|r| **r >= 128)
        .all(|r| (*r == 0x212A && lower == 'k') || (*r == 0x17F && lower == 's'));
    extra_ok.then_some(lower)
}

fn convert(hir: &Hir) -> Node {
    match hir.kind() {
        HirKind::Empty | HirKind::Look(_) => Node::Empty,
        HirKind::Literal(lit) => {
            Node::Lit(String::from_utf8_lossy(&lit.0).chars().collect(), false)
        }
        HirKind::Class(Class::Unicode(c)) => {
            let ranges: Vec<(u32, u32)> = c
                .ranges()
                .iter()
                .map(|r| (r.start() as u32, r.end() as u32))
                .collect();
            match fold_letter(&ranges) {
                Some(letter) => Node::Lit(vec![letter], true),
                None => Node::Class(ranges),
            }
        }
        HirKind::Class(Class::Bytes(c)) => Node::Class(
            c.ranges()
                .iter()
                .map(|r| (u32::from(r.start()), u32::from(r.end())))
                .collect(),
        ),
        HirKind::Repetition(rep) => Node::Repeat(rep.min, rep.max, Box::new(convert(&rep.sub))),
        HirKind::Capture(cap) => Node::Capture(Box::new(convert(&cap.sub))),
        HirKind::Concat(subs) => {
            let mut out: Vec<Node> = Vec::new();
            for sub in subs.iter().map(convert) {
                match (out.last_mut(), sub) {
                    (Some(Node::Lit(runes, fold)), Node::Lit(more, more_fold)) => {
                        runes.extend(more);
                        *fold |= more_fold;
                    }
                    (_, sub) => out.push(sub),
                }
            }
            if out.len() == 1 {
                out.pop().expect("one")
            } else {
                Node::Concat(out)
            }
        }
        HirKind::Alternation(subs) => Node::Alt(subs.iter().map(convert).collect()),
    }
}

pub fn parse(pattern: &str) -> Option<Node> {
    regex_syntax::ParserBuilder::new()
        .build()
        .parse(pattern)
        .ok()
        .map(|h| convert(&h))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Plan {
    pub before: i64,
    pub after: i64,
    pub newlines: i64,
    pub required: u8,
}

fn add(a: i64, b: i64) -> i64 {
    if a < 0 || b < 0 || a > LIMIT - b {
        -1
    } else {
        a + b
    }
}

fn multiply(a: i64, b: i64) -> i64 {
    if a == 0 || b == 0 {
        0
    } else if a < 0 || b < 0 || a > LIMIT / b {
        -1
    } else {
        a * b
    }
}

fn widest(a: i64, b: i64) -> i64 {
    if a < 0 || b < 0 { -1 } else { a.max(b) }
}

pub fn compile(node: &Node, keywords: &[String]) -> Option<Plan> {
    if keywords.is_empty() || keywords.iter().any(|k| k.is_empty() || !k.is_ascii()) {
        return None;
    }
    let mut plan = analyze(node, keywords)?;
    let mut required = mandatory(node);
    for keyword in keywords {
        for b in keyword.bytes() {
            required[usize::from(b)] = false;
        }
    }
    if let Some(b) = required.iter().position(|r| *r) {
        plan.required = b as u8;
    }
    Some(plan)
}

pub fn compile_prefix_windows(node: &Node, keywords: &[String]) -> Option<(Plan, Vec<String>)> {
    let prefixes: Vec<String> = keywords
        .iter()
        .map(|k| {
            k.trim_end_matches(|c: char| c.is_ascii() && !c.is_ascii_alphanumeric())
                .to_owned()
        })
        .collect();
    if prefixes.iter().zip(keywords).all(|(p, k)| p == k) {
        return None;
    }
    compile(node, &prefixes).map(|plan| (plan, prefixes))
}

fn analyze(node: &Node, keywords: &[String]) -> Option<Plan> {
    if let Some(literals) = literal_alternatives(node) {
        let mut combined = Plan::default();
        for literal in &literals {
            let lower = literal.to_lowercase();
            let mut found = false;
            for keyword in keywords {
                let keyword = keyword.to_lowercase();
                if let Some(index) = lower.find(&keyword) {
                    let tail = &literal[index + keyword.len()..];
                    combined.before = combined.before.max(index as i64 * UTF_MAX);
                    combined.after = combined.after.max(tail.len() as i64 * UTF_MAX);
                    combined.newlines = combined.newlines.max(tail.matches('\n').count() as i64);
                    found = true;
                    break;
                }
            }
            if !found {
                return None;
            }
        }
        return Some(combined);
    }
    match node {
        Node::Capture(sub) => analyze(sub, keywords),
        Node::Concat(subs) => {
            let mut before = 0;
            for i in 0..subs.len() {
                let mut end = i + 1;
                let mut plan = analyze(&subs[i], keywords);
                while plan.is_none() && end < subs.len() {
                    end += 1;
                    let joined = Node::Concat(subs[i..end].to_vec());
                    if literal_alternatives(&joined).is_none() {
                        break;
                    }
                    plan = analyze(&joined, keywords);
                }
                if let Some(mut plan) = plan {
                    plan.before = add(before, plan.before);
                    for suffix in &subs[end..] {
                        let (bytes, lines) = measure(suffix);
                        plan.after = add(plan.after, bytes);
                        plan.newlines = add(plan.newlines, lines);
                    }
                    if plan.before >= 0 && (plan.after >= 0 || plan.newlines >= 0) {
                        return Some(plan);
                    }
                }
                before = add(before, measure(&subs[i]).0);
                if before < 0 {
                    break;
                }
            }
            None
        }
        Node::Alt(subs) => {
            let mut combined = Plan::default();
            for sub in subs {
                let plan = analyze(sub, keywords)?;
                combined.before = widest(combined.before, plan.before);
                combined.after = widest(combined.after, plan.after);
                combined.newlines = widest(combined.newlines, plan.newlines);
            }
            Some(combined)
        }
        _ => None,
    }
}

fn literal_alternatives(node: &Node) -> Option<Vec<String>> {
    match node {
        Node::Lit(runes, _) => runes
            .iter()
            .all(char::is_ascii)
            .then(|| vec![runes.iter().collect()]),
        Node::Empty => Some(vec![String::new()]),
        Node::Capture(sub) => literal_alternatives(sub),
        Node::Repeat(0, Some(1), sub) => {
            let mut values = literal_alternatives(sub)?;
            values.push(String::new());
            Some(values)
        }
        Node::Class(ranges) => {
            let mut values = Vec::new();
            for (a, b) in ranges {
                if *b >= 128 || (b - a) as usize + values.len() >= 16 {
                    return None;
                }
                for r in *a..=*b {
                    values.push(char::from_u32(r)?.to_string());
                }
            }
            Some(values)
        }
        Node::Concat(subs) | Node::Alt(subs) => {
            let concat = matches!(node, Node::Concat(_));
            let mut values: Vec<String> = if concat {
                vec![String::new()]
            } else {
                Vec::new()
            };
            for sub in subs {
                let next = literal_alternatives(sub)?;
                if concat {
                    if values.len() * next.len() > 64 {
                        return None;
                    }
                    let mut joined = Vec::new();
                    for prefix in &values {
                        for suffix in &next {
                            if prefix.len() + suffix.len() > 256 {
                                return None;
                            }
                            joined.push(format!("{prefix}{suffix}"));
                        }
                    }
                    values = joined;
                } else {
                    values.extend(next);
                }
                if values.len() > 64 {
                    return None;
                }
            }
            Some(values)
        }
        Node::Repeat(..) => None,
    }
}

fn measure(node: &Node) -> (i64, i64) {
    match node {
        Node::Lit(runes, _) => (
            runes.len() as i64 * UTF_MAX,
            runes.iter().filter(|c| **c == '\n').count() as i64,
        ),
        Node::Class(ranges) => (
            UTF_MAX,
            i64::from(ranges.iter().any(|(a, b)| *a <= 10 && 10 <= *b)),
        ),
        Node::Empty => (0, 0),
        Node::Capture(sub) => measure(sub),
        Node::Repeat(_, max, sub) => {
            let (bytes, lines) = measure(sub);
            let count = max.map_or(-1, i64::from);
            (multiply(bytes, count), multiply(lines, count))
        }
        Node::Concat(subs) => subs
            .iter()
            .map(measure)
            .fold((0, 0), |(b, l), (sb, sl)| (add(b, sb), add(l, sl))),
        Node::Alt(subs) => subs
            .iter()
            .map(measure)
            .fold((0, 0), |(b, l), (sb, sl)| (widest(b, sb), widest(l, sl))),
    }
}

fn mandatory(node: &Node) -> [bool; 128] {
    let mut required = [false; 128];
    match node {
        Node::Lit(runes, _) => {
            for r in runes {
                if r.is_ascii_punctuation() {
                    required[*r as usize] = true;
                }
            }
        }
        Node::Capture(sub) => return mandatory(sub),
        Node::Repeat(min, _, sub) if *min > 0 => return mandatory(sub),
        Node::Concat(subs) => {
            for sub in subs {
                let next = mandatory(sub);
                for b in 0..128 {
                    required[b] |= next[b];
                }
            }
        }
        Node::Alt(subs) if !subs.is_empty() => {
            required = mandatory(&subs[0]);
            for sub in &subs[1..] {
                let next = mandatory(sub);
                for b in 0..128 {
                    required[b] &= next[b];
                }
            }
        }
        _ => {}
    }
    required
}

#[derive(Debug, Clone)]
pub struct Guard {
    identifier: [bool; 128],
    padding: [bool; 128],
    operator: [bool; 128],
    identifier_max: usize,
    padding_max: usize,
}

pub fn infer_guard(node: &Node, keywords: &[String]) -> Option<Guard> {
    let Node::Concat(subs) = node else {
        return None;
    };
    if subs.len() < 4 {
        return None;
    }
    let literals = folded_literals(&subs[0])?;
    if literals.is_empty() {
        return None;
    }
    for literal in &literals {
        if literal.is_empty() || !keywords.iter().any(|k| *literal == k.to_lowercase()) {
            return None;
        }
    }
    let (identifier, identifier_max) = optional_class(&subs[1])?;
    let (padding, padding_max) = optional_class(&subs[2])?;
    let operator = first_bytes(&subs[3])?;
    for b in 0..128 {
        if operator[b] && (identifier[b] || padding[b]) {
            return None;
        }
    }
    Some(Guard {
        identifier,
        padding,
        operator,
        identifier_max,
        padding_max,
    })
}

impl Guard {
    pub fn possible(&self, raw: &[u8], end: usize) -> bool {
        let mut i = end;
        for (set, max) in [
            (&self.identifier, self.identifier_max),
            (&self.padding, self.padding_max),
        ] {
            let mut count = 0;
            while count < max && i < raw.len() {
                let b = raw[i];
                if b >= 128 {
                    return true;
                }
                if !set[usize::from(b)] {
                    break;
                }
                i += 1;
                count += 1;
            }
        }
        i < raw.len() && (raw[i] >= 128 || self.operator[usize::from(raw[i])])
    }
}

fn optional_class(node: &Node) -> Option<([bool; 128], usize)> {
    let Node::Repeat(0, Some(max), sub) = node else {
        return None;
    };
    if *max > 64 || *max == 1 {
        return None;
    }
    Some((rune_set(sub)?, *max as usize))
}

fn rune_set(node: &Node) -> Option<[bool; 128]> {
    let mut set = [false; 128];
    match node {
        Node::Class(ranges) => {
            for (b, slot) in set.iter_mut().enumerate() {
                *slot = ranges.iter().any(|(a, z)| *a <= b as u32 && b as u32 <= *z);
            }
            Some(set)
        }
        Node::Lit(runes, fold) if runes.len() == 1 => {
            let r = runes[0];
            for (b, slot) in set.iter_mut().enumerate() {
                let c = b as u8 as char;
                *slot = c == r || (*fold && c.eq_ignore_ascii_case(&r));
            }
            Some(set)
        }
        _ => None,
    }
}

fn first_bytes(node: &Node) -> Option<[bool; 128]> {
    match node {
        Node::Lit(runes, fold) => {
            let first = *runes.first()?;
            if !first.is_ascii() {
                return None;
            }
            rune_set(&Node::Lit(vec![first], *fold))
        }
        Node::Class(ranges) => {
            if ranges.last().is_none_or(|(_, z)| *z >= 128) {
                return None;
            }
            rune_set(node)
        }
        Node::Capture(sub) => first_bytes(sub),
        Node::Concat(subs) => first_bytes(subs.first()?),
        Node::Alt(subs) => {
            let mut set = [false; 128];
            if subs.is_empty() {
                return None;
            }
            for sub in subs {
                let part = first_bytes(sub)?;
                for b in 0..128 {
                    set[b] |= part[b];
                }
            }
            Some(set)
        }
        Node::Repeat(min, _, sub) if *min > 0 => first_bytes(sub),
        _ => None,
    }
}

fn fold_ascii(r: char) -> Option<char> {
    let r = match r {
        '\u{17f}' => 's',
        '\u{212a}' => 'k',
        r => r,
    };
    r.is_ascii().then(|| r.to_ascii_lowercase())
}

fn folded_literals(node: &Node) -> Option<Vec<String>> {
    match node {
        Node::Lit(runes, _) => Some(vec![
            runes
                .iter()
                .map(|r| fold_ascii(*r))
                .collect::<Option<String>>()?,
        ]),
        Node::Class(ranges) => {
            let mut words = Vec::new();
            let mut seen = [false; 128];
            for (a, b) in ranges {
                if b - a > 128 {
                    return None;
                }
                for r in *a..=*b {
                    let c = fold_ascii(char::from_u32(r)?)?;
                    if !seen[c as usize] {
                        seen[c as usize] = true;
                        words.push(c.to_string());
                    }
                }
            }
            Some(words)
        }
        Node::Capture(sub) => folded_literals(sub),
        Node::Concat(subs) | Node::Alt(subs) => {
            let concat = matches!(node, Node::Concat(_));
            let mut words: Vec<String> = if concat {
                vec![String::new()]
            } else {
                Vec::new()
            };
            for sub in subs {
                let part = folded_literals(sub)?;
                if concat {
                    if words.len() * part.len() > 1024 {
                        return None;
                    }
                    let mut combined = Vec::new();
                    for a in &words {
                        for b in &part {
                            if a.len() + b.len() > 128 {
                                return None;
                            }
                            combined.push(format!("{a}{b}"));
                        }
                    }
                    words = combined;
                } else {
                    words.extend(part);
                }
                if words.len() > 1024 {
                    return None;
                }
            }
            Some(words)
        }
        _ => None,
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Span {
    pub start: usize,
    pub end: usize,
}

const MAX_WINDOWS: usize = 256;

#[derive(Default)]
pub struct Windows {
    pub spans: Vec<Span>,
    first_newline: usize,
    last_newline: usize,
}

fn rune_start(b: u8) -> bool {
    b & 0xC0 != 0x80
}

impl Windows {
    pub fn add(&mut self, text: &[u8], start: usize, end: usize, plan: &Plan) {
        if self.spans.len() == 1 && self.spans[0].start == 0 && self.spans[0].end == text.len() {
            return;
        }
        let pad = UTF_MAX as usize;
        let mut start = start.saturating_sub(plan.before as usize + pad);
        let mut end = if plan.after >= 0 {
            text.len().min(end + plan.after as usize + pad)
        } else {
            if end > self.first_newline || self.spans.is_empty() {
                self.first_newline = text.len();
                self.last_newline = text.len();
                if let Some(first) = memchr(&text[end..]) {
                    self.first_newline = end + first;
                    self.last_newline = self.first_newline;
                    for _ in 0..plan.newlines {
                        if let Some(next) = memchr(&text[self.last_newline + 1..]) {
                            self.last_newline += next + 1;
                        } else {
                            self.last_newline = text.len();
                            break;
                        }
                    }
                }
            }
            text.len().min(self.last_newline + 1 + pad)
        };
        while start > 0 && !rune_start(text[start]) {
            start -= 1;
        }
        while end < text.len() && !rune_start(text[end]) {
            end += 1;
        }
        while let Some(last) = self.spans.last() {
            if last.end < start {
                break;
            }
            start = start.min(last.start);
            end = end.max(last.end);
            self.spans.pop();
        }
        self.spans.push(Span { start, end });
        if self.spans.len() > MAX_WINDOWS {
            self.spans.truncate(1);
            self.spans[0] = Span {
                start: 0,
                end: text.len(),
            };
        }
    }
}

fn memchr(text: &[u8]) -> Option<usize> {
    text.iter().position(|b| *b == b'\n')
}

#[cfg(test)]
mod tests {
    use super::{Windows, compile, compile_prefix_windows, infer_guard, parse};

    fn words(list: &[&str]) -> Vec<String> {
        list.iter().map(|w| (*w).to_owned()).collect()
    }

    #[test]
    fn bounds_the_text_around_a_literal_keyword() {
        let node = parse(r"(?i)\btoken_([a-z0-9]{8})\b").unwrap();
        let plan = compile(&node, &words(&["token_"])).unwrap();
        assert_eq!((plan.before, plan.after, plan.newlines), (0, 32, 0));
    }

    #[test]
    fn gives_up_when_a_match_need_not_contain_the_keyword() {
        let node = parse(r"[a-z]+=[0-9]{4}").unwrap();
        assert!(compile(&node, &words(&["key"])).is_none());
    }

    #[test]
    fn records_mandatory_punctuation_outside_the_keywords() {
        let node = parse(r"user([a-z]+)@host").unwrap();
        assert_eq!(compile(&node, &words(&["user"])).unwrap().required, b'@');
    }

    #[test]
    fn trims_punctuation_off_keywords_into_search_anchors() {
        let node = parse(r"api[ \t]*=[ \t]*([a-z]{8})").unwrap();
        let (_, anchors) = compile_prefix_windows(&node, &words(&["api="])).unwrap();
        assert_eq!(anchors, ["api"]);
    }

    #[test]
    fn a_guard_rejects_a_keyword_without_an_assignment() {
        let node = parse(r"(?i)(?:password)[\w.-]{0,10}[ \t]{0,4}(?:=|:)\s*([^\s]{8,})").unwrap();
        let guard = infer_guard(&node, &words(&["password"])).unwrap();
        assert!(guard.possible(b"password_x = secret", 8));
        assert!(!guard.possible(b"password reset link", 8));
    }

    #[test]
    fn merges_overlapping_windows() {
        let node = parse(r"key([a-z]{4})").unwrap();
        let plan = compile(&node, &words(&["key"])).unwrap();
        let text = b"key abcd key efgh";
        let mut windows = Windows::default();
        windows.add(text, 0, 3, &plan);
        windows.add(text, 9, 12, &plan);
        assert_eq!(windows.spans.len(), 1);
        assert_eq!(
            (windows.spans[0].start, windows.spans[0].end),
            (0, text.len())
        );
    }
}

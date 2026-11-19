use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap};
use std::rc::Rc;
use std::sync::{Arc, OnceLock};

use aho_corasick::{AhoCorasick, AhoCorasickBuilder, AhoCorasickKind, MatchKind};
use anyhow::{Context as _, Result, anyhow};
use regex::{Captures, Regex, RegexBuilder};

use super::codec::{self, Segment};
use super::config::Config;
use super::span::{self, Guard, Plan, Span, Windows};
use crate::shared::expr::{self, Expr, Scope, Value};
use crate::shared::text;

const ALLOW: [&str; 2] = ["betterleaks:allow", "gitleaks:allow"];

struct Pattern {
    source: String,
    compiled: OnceLock<Result<Regex, regex::Error>>,
}

impl Pattern {
    fn new(source: &str) -> Option<Self> {
        (!source.is_empty()).then(|| Self {
            source: source.to_owned(),
            compiled: OnceLock::new(),
        })
    }

    fn get(&self) -> Result<&Regex> {
        self.compiled
            .get_or_init(|| {
                RegexBuilder::new(&text::go_regex(&self.source))
                    .size_limit(1 << 28)
                    .dfa_size_limit(1 << 26)
                    .build()
            })
            .as_ref()
            .map_err(|error| anyhow!("{error}"))
    }
}

#[derive(Debug, Clone, Copy)]
enum Window {
    Any,
    Lines(usize, usize),
    Cols(usize, usize),
}

fn window_of(value: &str) -> Window {
    let value = value.trim();
    if value.is_empty() || value == "0" {
        return Window::Any;
    }
    let (mut lines, mut cols, mut has_lines) = ((0, 0), (0, 0), false);
    for token in value.split(',') {
        let token = token.trim();
        let (marker, rest) = match token.as_bytes().first() {
            Some(b'+') => ('+', &token[1..]),
            Some(b'-') => ('-', &token[1..]),
            _ => (' ', token),
        };
        let (digits, unit) = match rest.chars().last() {
            Some(c) if c.is_ascii_alphabetic() => (&rest[..rest.len() - 1], c.to_ascii_uppercase()),
            _ => (rest, 'C'),
        };
        let mut amount: usize = digits.parse().unwrap_or(0);
        let target = if unit == 'L' {
            has_lines = true;
            amount = amount.saturating_sub(1);
            &mut lines
        } else {
            &mut cols
        };
        match marker {
            '-' => target.0 = target.0.max(amount),
            '+' => target.1 = target.1.max(amount),
            _ => {
                target.0 = target.0.max(amount);
                target.1 = target.1.max(amount);
            }
        }
    }
    if has_lines {
        Window::Lines(lines.0, lines.1)
    } else {
        Window::Cols(cols.0, cols.1)
    }
}

struct Rule {
    id: String,
    description: String,
    regex: Option<Pattern>,
    path: Option<Pattern>,
    keywords: Vec<String>,
    filter: Option<Expr>,
    skip_report: bool,
    specificity: i64,
    value_group: usize,
    confidence: String,
    components: Vec<(usize, Window, bool)>,
    span: Option<Plan>,
    anchors: Vec<String>,
    guard: Option<Guard>,
}

#[derive(Debug, Clone)]
pub struct Hit {
    rule: usize,
    pub rule_id: String,
    pub description: String,
    pub secret: String,
    pub start: usize,
    pub end: usize,
    pub start_line: usize,
    pub end_line: usize,
    pub confidence: String,
    pub encoded: bool,
    components: Vec<Hit>,
}

pub struct Scanner {
    rules: Vec<Rule>,
    keywords: AhoCorasick,
    keyword_rules: Vec<Vec<usize>>,
    anchor_rules: Vec<Vec<usize>>,
    no_keyword: Vec<usize>,
    prefilter: Option<Expr>,
    filter: Option<Expr>,
    max_decode_depth: usize,
}

struct Input<'a> {
    path: &'a str,
    raw: &'a str,
    current: &'a str,
    segments: &'a [Rc<Segment>],
    lines: &'a [usize],
    attributes: &'a Value,
}

fn expression(source: &str, what: &str) -> Result<Option<Expr>> {
    if source.trim().is_empty() {
        return Ok(None);
    }
    expr::parse(source)
        .map(Some)
        .with_context(|| format!("invalid {what}"))
}

fn compile_rule(rule: &super::config::RuleConfig, index: &HashMap<&str, usize>) -> Result<Rule> {
    let node = (!rule.regex.is_empty())
        .then(|| span::parse(&text::go_regex(&rule.regex)))
        .flatten();
    let mut plan = node
        .as_ref()
        .and_then(|node| span::compile(node, &rule.keywords));
    let mut anchors = Vec::new();
    if plan.is_none()
        && let Some((found, prefixes)) = node
            .as_ref()
            .and_then(|node| span::compile_prefix_windows(node, &rule.keywords))
    {
        plan = Some(found);
        anchors = prefixes;
    }
    Ok(Rule {
        guard: node
            .as_ref()
            .and_then(|node| span::infer_guard(node, &rule.keywords)),
        span: plan,
        anchors,
        id: rule.id.clone(),
        description: rule.description.clone(),
        regex: Pattern::new(&rule.regex),
        path: Pattern::new(&rule.path),
        keywords: rule.keywords.clone(),
        filter: expression(&rule.filter, &format!("filter of {}", rule.id))?,
        skip_report: rule.skip_report,
        specificity: rule.specificity,
        value_group: rule.value_group,
        confidence: rule.confidence.clone(),
        components: rule
            .components
            .iter()
            .map(|c| (index[c.id.as_str()], window_of(&c.within), c.optional))
            .collect(),
    })
}

fn word_id(
    word: &str,
    words: &mut Vec<String>,
    ids: &mut HashMap<String, usize>,
    lists: [&mut Vec<Vec<usize>>; 2],
) -> usize {
    *ids.entry(word.to_owned()).or_insert_with(|| {
        words.push(word.to_owned());
        for list in lists {
            list.push(Vec::new());
        }
        words.len() - 1
    })
}

impl Scanner {
    pub fn new(config: Config) -> Result<Self> {
        let mut configs = config.rules;
        configs.sort_by_key(|rule| std::cmp::Reverse(rule.specificity));
        let index: HashMap<&str, usize> = configs
            .iter()
            .enumerate()
            .map(|(i, rule)| (rule.id.as_str(), i))
            .collect();
        let rules = configs
            .iter()
            .map(|rule| compile_rule(rule, &index))
            .collect::<Result<Vec<_>>>()?;
        let mut words = Vec::new();
        let mut ids = HashMap::new();
        let mut keyword_rules = Vec::new();
        let mut anchor_rules = Vec::new();
        let mut no_keyword = Vec::new();
        for (i, rule) in rules.iter().enumerate() {
            if rule.keywords.is_empty() {
                no_keyword.push(i);
            }
            for word in &rule.keywords {
                let id = word_id(
                    word,
                    &mut words,
                    &mut ids,
                    [&mut keyword_rules, &mut anchor_rules],
                );
                keyword_rules[id].push(i);
            }
            for word in &rule.anchors {
                let id = word_id(
                    &word.to_lowercase(),
                    &mut words,
                    &mut ids,
                    [&mut keyword_rules, &mut anchor_rules],
                );
                anchor_rules[id].push(i);
            }
        }
        Ok(Self {
            keywords: AhoCorasickBuilder::new()
                .ascii_case_insensitive(true)
                .match_kind(MatchKind::Standard)
                .kind(Some(AhoCorasickKind::DFA))
                .build(&words)?,
            rules,
            keyword_rules,
            anchor_rules,
            no_keyword,
            prefilter: expression(&config.prefilter, "prefilter")?,
            filter: expression(&config.filter, "global filter")?,
            max_decode_depth: config.max_decode_depth,
        })
    }

    pub fn scan(&self, path: &str, raw: &str) -> Result<Vec<Hit>> {
        let attributes = Value::Map(Arc::new(BTreeMap::from([(
            "path".to_owned(),
            Value::string(path),
        )])));
        if let Some(prefilter) = &self.prefilter {
            let empty = Value::Map(Arc::new(BTreeMap::new()));
            let scope = Scope {
                finding: &empty,
                attributes: &attributes,
                confidence: RefCell::new(None),
            };
            if expr::evaluate(prefilter, &scope)? {
                return Ok(Vec::new());
            }
        }
        let lines = line_offsets(raw);
        let mut hits: Vec<Hit> = Vec::new();
        let mut current = raw.to_owned();
        let mut segments: Vec<Rc<Segment>> = Vec::new();
        for depth in 0..=self.max_decode_depth {
            let input = Input {
                path,
                raw,
                current: &current,
                segments: &segments,
                lines: &lines,
                attributes: &attributes,
            };
            self.pass(&input, depth, &mut hits)?;
            if depth == self.max_decode_depth {
                break;
            }
            let (next, next_segments) = codec::decode(&current, &segments);
            if next_segments.is_empty() {
                break;
            }
            current = next;
            segments = next_segments;
        }
        let components: Vec<(String, usize, usize, String)> = hits
            .iter()
            .flat_map(|hit| hit.components.iter())
            .map(|c| (c.rule_id.clone(), c.start, c.end, c.secret.clone()))
            .collect();
        let snapshot = hits.clone();
        hits.retain(|hit| {
            !components.contains(&(hit.rule_id.clone(), hit.start, hit.end, hit.secret.clone()))
                && !self.suppressed(hit, &snapshot)
        });
        Ok(hits)
    }

    fn pass(&self, input: &Input<'_>, depth: usize, hits: &mut Vec<Hit>) -> Result<()> {
        let mut marked = vec![false; self.rules.len()];
        let mut windows: Vec<Windows> = (0..self.rules.len()).map(|_| Windows::default()).collect();
        let bytes = input.current.as_bytes();
        for found in self.keywords.find_overlapping_iter(input.current) {
            let pattern = found.pattern().as_usize();
            for &i in &self.keyword_rules[pattern] {
                let rule = &self.rules[i];
                if rule
                    .guard
                    .as_ref()
                    .is_some_and(|guard| !guard.possible(bytes, found.end()))
                {
                    continue;
                }
                marked[i] = true;
                if let (Some(plan), true) = (&rule.span, rule.anchors.is_empty()) {
                    windows[i].add(bytes, found.start(), found.end(), plan);
                }
            }
            for &i in &self.anchor_rules[pattern] {
                if let Some(plan) = &self.rules[i].span {
                    windows[i].add(bytes, found.start(), found.end(), plan);
                }
            }
        }
        for &i in &self.no_keyword {
            marked[i] = true;
        }
        for (i, rule) in self.rules.iter().enumerate() {
            let skipped = !marked[i]
                || rule.skip_report
                || (!rule.anchors.is_empty() && windows[i].spans.is_empty())
                || (rule.regex.is_none() && depth > 0);
            if skipped {
                continue;
            }
            let found = self.detect(i, input, Some(hits), false, &windows[i].spans)?;
            hits.extend(found);
        }
        Ok(())
    }

    fn overlap(&self, a: &Hit, b: &Hit) -> bool {
        let located = |hit: &Hit| self.rules[hit.rule].regex.is_some();
        located(a)
            && located(b)
            && a.start < b.end.max(b.start + 1)
            && b.start < a.end.max(a.start + 1)
    }

    fn suppressed(&self, hit: &Hit, prior: &[Hit]) -> bool {
        prior.iter().any(|owner| {
            let beats = |other: &Hit| {
                other.rule_id != hit.rule_id
                    && self.overlap(other, hit)
                    && other.secret.contains(&hit.secret)
                    && self.rules[other.rule].specificity > self.rules[hit.rule].specificity
            };
            beats(owner) || owner.components.iter().any(beats)
        })
    }

    fn filtered(&self, rule: &Rule, finding: &Value, attributes: &Value) -> (bool, Option<String>) {
        let scope = Scope {
            finding,
            attributes,
            confidence: RefCell::new(None),
        };
        let mut skip = false;
        for program in [self.filter.as_ref(), rule.filter.as_ref()]
            .into_iter()
            .flatten()
        {
            match expr::evaluate(program, &scope) {
                Ok(true) => {
                    skip = true;
                    break;
                }
                Ok(false) => {}
                Err(error) => tracing::warn!(rule = %rule.id, %error, "filter evaluation failed"),
            }
        }
        (skip, scope.confidence.borrow_mut().take())
    }

    fn path_only(&self, i: usize, input: &Input<'_>) -> Vec<Hit> {
        let rule = &self.rules[i];
        if input.path.is_empty() || rule.path.is_none() {
            return Vec::new();
        }
        let mut map = BTreeMap::new();
        for key in ["secret", "line", "fragment_raw"] {
            map.insert(key.to_owned(), Value::string(""));
        }
        map.insert(
            "match".to_owned(),
            Value::string(&format!("file detected: {}", input.path)),
        );
        map.insert("rule_id".to_owned(), Value::string(&rule.id));
        map.insert("description".to_owned(), Value::string(&rule.description));
        for key in [
            "match_start_idx",
            "match_end_idx",
            "match_line_start_idx",
            "match_line_end_idx",
        ] {
            map.insert(key.to_owned(), Value::Int(0));
        }
        let (skip, level) = self.filtered(rule, &Value::Map(Arc::new(map)), input.attributes);
        if skip {
            return Vec::new();
        }
        vec![Hit {
            rule: i,
            rule_id: rule.id.clone(),
            description: rule.description.clone(),
            secret: String::new(),
            start: 0,
            end: 0,
            start_line: 1,
            end_line: 1,
            confidence: level.unwrap_or_else(|| rule.confidence.clone()),
            encoded: false,
            components: Vec::new(),
        }]
    }

    fn detect(
        &self,
        i: usize,
        input: &Input<'_>,
        prior: Option<&[Hit]>,
        component: bool,
        spans: &[Span],
    ) -> Result<Vec<Hit>> {
        let rule = &self.rules[i];
        if rule.skip_report && !component {
            return Ok(Vec::new());
        }
        if let Some(path) = &rule.path
            && !path.get()?.is_match(input.path)
        {
            return Ok(Vec::new());
        }
        let Some(regex) = &rule.regex else {
            return Ok(self.path_only(i, input));
        };
        if let Some(plan) = &rule.span
            && plan.required != 0
            && !input.current.as_bytes().contains(&plan.required)
        {
            return Ok(Vec::new());
        }
        let regex = regex.get().with_context(|| rule.id.clone())?;
        let full = [Span {
            start: 0,
            end: input.current.len(),
        }];
        let ranges = if spans.is_empty() { &full[..] } else { spans };
        let mut out = Vec::new();
        for range in ranges {
            for caps in regex.captures_iter(&input.current[range.start..range.end]) {
                if let Some(hit) = self.hit(i, input, &caps, range.start, prior) {
                    out.push(hit);
                }
            }
        }
        if component || rule.components.is_empty() || out.is_empty() {
            return Ok(out);
        }
        self.with_components(rule, input, out)
    }

    fn hit(
        &self,
        i: usize,
        input: &Input<'_>,
        caps: &Captures<'_>,
        base: usize,
        prior: Option<&[Hit]>,
    ) -> Option<Hit> {
        let rule = &self.rules[i];
        let (raw, current) = (input.raw, input.current);
        let whole = caps.get(0)?;
        let (ws, we) = (base + whole.start(), base + whole.end());
        let full = whole.as_str().trim_matches('\n');
        let lead = whole.as_str().len() - whole.as_str().trim_start_matches('\n').len();
        let mut decoded_line = None;
        let (start, end) = if input.segments.is_empty() {
            (ws + lead, ws + lead + full.len())
        } else {
            let near = codec::overlapping(input.segments, ws, we);
            if near.is_empty() {
                return None;
            }
            let range = codec::to_original(&near, codec::Range { start: ws, end: we });
            decoded_line = Some(codec::current_line(&near, current));
            (range.start.min(raw.len()), range.end.min(raw.len()))
        };
        let start_line = line_of(input.lines, start);
        let end_line = line_of(input.lines, end.max(start));
        let line_start = input.lines[start_line - 1];
        let line_end = raw[end..].find('\n').map_or(raw.len(), |n| end + n);
        let line = &raw[line_start..line_end];
        let whole_line = &raw[line_start..raw.len().min(line_end + 1)];
        if ALLOW.iter().any(|sig| line.contains(sig)) {
            return None;
        }
        let mut secret = full.to_owned();
        if caps.len() > 1 {
            if rule.value_group > 0 {
                secret = caps
                    .get(rule.value_group)
                    .map_or(String::new(), |m| m.as_str().to_owned());
            } else if let Some(m) = (1..caps.len())
                .filter_map(|g| caps.get(g))
                .find(|m| !m.as_str().is_empty())
            {
                m.as_str().clone_into(&mut secret);
            }
        }
        let mut hit = Hit {
            rule: i,
            rule_id: rule.id.clone(),
            description: rule.description.clone(),
            secret,
            start,
            end,
            start_line,
            end_line,
            confidence: rule.confidence.clone(),
            encoded: !input.segments.is_empty(),
            components: Vec::new(),
        };
        if prior.is_some_and(|prior| self.suppressed(&hit, prior)) {
            return None;
        }
        if self.filter.is_some() || rule.filter.is_some() {
            let mut map = BTreeMap::new();
            map.insert("secret".to_owned(), Value::string(&hit.secret));
            map.insert("match".to_owned(), Value::string(full));
            map.insert(
                "line".to_owned(),
                Value::string(decoded_line.as_deref().unwrap_or(whole_line)),
            );
            map.insert("rule_id".to_owned(), Value::string(&rule.id));
            map.insert("description".to_owned(), Value::string(&rule.description));
            map.insert("confidence".to_owned(), Value::string(&rule.confidence));
            map.insert("context".to_owned(), Value::string(""));
            map.insert("fragment_raw".to_owned(), Value::string(current));
            map.insert("match_start_idx".to_owned(), Value::Int(ws as i64));
            map.insert("match_end_idx".to_owned(), Value::Int(we as i64));
            map.insert("captures".to_owned(), captures_of(rule, caps));
            map.insert(
                "entropy".to_owned(),
                Value::string(&text::entropy(&hit.secret).to_string()),
            );
            let line_start = current[..ws].rfind(['\r', '\n']).map_or(0, |n| n + 1);
            let line_end = current[we..]
                .find(['\r', '\n'])
                .map_or(current.len(), |n| we + n);
            map.insert(
                "match_line_start_idx".to_owned(),
                Value::Int(line_start as i64),
            );
            map.insert("match_line_end_idx".to_owned(), Value::Int(line_end as i64));
            let (skip, level) = self.filtered(rule, &Value::Map(Arc::new(map)), input.attributes);
            if let Some(level) = level {
                hit.confidence = level;
            }
            if skip {
                return None;
            }
        }
        Some(hit)
    }

    fn with_components(
        &self,
        rule: &Rule,
        input: &Input<'_>,
        primary: Vec<Hit>,
    ) -> Result<Vec<Hit>> {
        let found: Vec<Vec<Hit>> = rule
            .components
            .iter()
            .map(|(c, _, _)| self.detect(*c, input, None, true, &[]))
            .collect::<Result<_>>()?;
        Ok(primary
            .into_iter()
            .filter_map(|mut primary| {
                for ((_, window, optional), candidates) in rule.components.iter().zip(&found) {
                    let near: Vec<Hit> = candidates
                        .iter()
                        .filter(|c| within(input.raw.len(), &primary, c, *window))
                        .cloned()
                        .collect();
                    if near.is_empty() && !optional {
                        return None;
                    }
                    primary.components.extend(near);
                }
                Some(primary)
            })
            .collect())
    }
}

fn captures_of(rule: &Rule, caps: &Captures<'_>) -> Value {
    let names = rule
        .regex
        .as_ref()
        .and_then(|pattern| pattern.get().ok())
        .map_or_default(|regex| regex.capture_names().collect::<Vec<_>>());
    let found = names
        .iter()
        .enumerate()
        .filter_map(|(i, name)| {
            let value = caps.get(i).filter(|m| !m.as_str().is_empty())?;
            Some(((*name)?.to_owned(), Value::string(value.as_str())))
        })
        .collect();
    Value::Map(Arc::new(found))
}

fn within(len: usize, primary: &Hit, component: &Hit, window: Window) -> bool {
    match window {
        Window::Any => true,
        Window::Lines(before, after) => {
            component.start_line + before >= primary.start_line
                && component.start_line <= primary.end_line + after
        }
        Window::Cols(before, after) => {
            component.start >= primary.start.saturating_sub(before)
                && component.start < (primary.end + after).min(len)
        }
    }
}

fn line_offsets(raw: &str) -> Vec<usize> {
    std::iter::once(0)
        .chain(raw.match_indices('\n').map(|(i, _)| i + 1))
        .collect()
}

fn line_of(lines: &[usize], offset: usize) -> usize {
    lines.partition_point(|start| *start <= offset)
}

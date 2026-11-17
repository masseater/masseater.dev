use std::collections::HashMap;
use std::sync::LazyLock;

use regex::Regex;
use serde::Serialize;
use serde_json::{Map, Value};

use crate::features::check_markdown::rule::Rule;
use crate::shared::source::Source;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Severity {
    Error,
    Warning,
}

#[derive(Debug, Clone)]
pub struct Setting {
    pub enabled: bool,
    pub severity: Severity,
    pub options: Value,
}

pub struct Names {
    lookup: HashMap<String, Vec<usize>>,
}

impl Names {
    #[must_use]
    pub fn new(rules: &[&dyn Rule]) -> Self {
        let mut lookup: HashMap<String, Vec<usize>> = HashMap::new();
        for (index, rule) in rules.iter().enumerate() {
            let meta = rule.meta();
            for name in meta.names.iter().chain(meta.tags) {
                lookup.entry(name.to_uppercase()).or_default().push(index);
            }
        }
        Self { lookup }
    }

    #[must_use]
    pub fn resolve(&self, name: &str) -> &[usize] {
        self.lookup
            .get(&name.to_uppercase())
            .map_or(&[], Vec::as_slice)
    }
}

#[must_use]
pub fn effective(rule_count: usize, names: &Names, config: &Map<String, Value>) -> Vec<Setting> {
    let default = config
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case("default"));
    let default_enabled = default.is_none_or(|(_, v)| truthy(v));
    let default_severity = match default {
        Some((_, Value::String(s))) if s == "warning" => Severity::Warning,
        _ => Severity::Error,
    };
    let mut settings = vec![
        Setting {
            enabled: default_enabled,
            severity: default_severity,
            options: Value::Object(Map::new()),
        };
        rule_count
    ];
    for (key, value) in config {
        let setting = setting_of(value);
        for &index in names.resolve(key) {
            settings[index] = setting.clone();
        }
    }
    settings
}

fn truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0),
        Value::String(s) => !s.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

fn setting_of(value: &Value) -> Setting {
    match value {
        Value::Object(object) => Setting {
            enabled: object.get("enabled").is_none_or(truthy),
            severity: if object.get("severity").and_then(Value::as_str) == Some("warning") {
                Severity::Warning
            } else {
                Severity::Error
            },
            options: Value::Object(
                object
                    .iter()
                    .filter(|(k, _)| k.as_str() != "enabled" && k.as_str() != "severity")
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect(),
            ),
        },
        other => Setting {
            enabled: truthy(other),
            severity: if other.as_str() == Some("warning") {
                Severity::Warning
            } else {
                Severity::Error
            },
            options: Value::Object(Map::new()),
        },
    }
}

static INLINE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(<!--\s*(?:markdownlint|mdlint)-(disable-next-line|disable-line|disable-file|enable-file|configure-file|disable|enable|capture|restore))(?:\s|-->)")
        .expect("inline pattern")
});

struct Directive {
    action: String,
    parameter: String,
    line: usize,
}

fn directives(text: &str, line_offset: usize) -> Vec<Directive> {
    let mut found = Vec::new();
    for (index, line) in text.split('\n').enumerate() {
        let mut at = 0;
        while let Some(caps) = INLINE.captures_at(line, at) {
            let whole = caps.get(1).expect("group");
            let start = whole.end();
            let Some(end) = line[start..].find("-->") else {
                break;
            };
            found.push(Directive {
                action: caps[2].to_uppercase(),
                parameter: line[start..start + end].to_owned(),
                line: index + line_offset,
            });
            at = caps.get(0).expect("match").end();
        }
    }
    found
}

pub struct Plan {
    pub settings: Vec<Setting>,
    pub states: Vec<Vec<bool>>,
    pub line_state: Vec<u32>,
}

impl Plan {
    #[must_use]
    pub fn enabled(&self, rule: usize, line: usize) -> bool {
        self.line_state
            .get(line)
            .is_some_and(|&state| self.states[state as usize][rule])
    }

    #[must_use]
    pub fn used(&self, rule: usize) -> bool {
        self.states.iter().any(|rules| rules[rule])
    }
}

fn apply(state: &[bool], action: &str, parameter: &str, names: &Names) -> Vec<bool> {
    let mut next = state.to_vec();
    let enable = action.starts_with("ENABLE");
    let trimmed = parameter.trim();
    if trimmed.is_empty() {
        next.fill(enable);
    } else {
        for name in trimmed.split_whitespace() {
            for &index in names.resolve(name) {
                next[index] = enable;
            }
        }
    }
    next
}

#[must_use]
pub fn plan(
    source: &Source,
    names: &Names,
    rule_count: usize,
    base: &Map<String, Value>,
    inline: bool,
) -> Plan {
    let has_directives =
        inline && source.text.contains("<!--") && contains_ignore_case(&source.text, "lint-");
    let all = if has_directives {
        directives(&source.text, 0)
    } else {
        Vec::new()
    };
    let mut config = base.clone();
    if has_directives && contains_ignore_case(&source.text, "configure-file") {
        let joined = directives(&source.text.replace('\n', " "), 0);
        for directive in joined.iter().filter(|d| d.action == "CONFIGURE-FILE") {
            if let Ok(Value::Object(parsed)) = serde_json::from_str::<Value>(&directive.parameter) {
                config.extend(parsed);
            }
        }
    }
    let settings = effective(rule_count, names, &config);
    let mut enabled: Vec<bool> = settings.iter().map(|s| s.enabled).collect();
    for directive in all
        .iter()
        .filter(|d| d.action == "ENABLE-FILE" || d.action == "DISABLE-FILE")
    {
        enabled = apply(&enabled, &directive.action, &directive.parameter, names);
    }
    let mut states = vec![enabled.clone()];
    let mut line_state = vec![0u32; source.line_count()];
    let mut captured = enabled.clone();
    let mut current = 0u32;
    let mut cursor = 0;
    for (line, slot) in line_state.iter_mut().enumerate() {
        let mut changed = false;
        while cursor < all.len() && all[cursor].line == line {
            let directive = &all[cursor];
            match directive.action.as_str() {
                "CAPTURE" => captured.clone_from(&enabled),
                "RESTORE" => {
                    enabled.clone_from(&captured);
                    changed = true;
                }
                "ENABLE" | "DISABLE" => {
                    enabled = apply(&enabled, &directive.action, &directive.parameter, names);
                    changed = true;
                }
                _ => {}
            }
            cursor += 1;
        }
        if changed {
            states.push(enabled.clone());
            current = u32::try_from(states.len() - 1).unwrap_or(u32::MAX);
        }
        *slot = current;
    }
    for directive in &all {
        let target = match directive.action.as_str() {
            "DISABLE-LINE" => directive.line,
            "DISABLE-NEXT-LINE" => directive.line + 1,
            _ => continue,
        };
        if let Some(&state) = line_state.get(target) {
            let next = apply(
                &states[state as usize],
                &directive.action,
                &directive.parameter,
                names,
            );
            states.push(next);
            line_state[target] = u32::try_from(states.len() - 1).unwrap_or(u32::MAX);
        }
    }
    Plan {
        settings,
        states,
        line_state,
    }
}

fn contains_ignore_case(haystack: &str, needle: &str) -> bool {
    haystack
        .as_bytes()
        .windows(needle.len())
        .any(|window| window.eq_ignore_ascii_case(needle.as_bytes()))
}

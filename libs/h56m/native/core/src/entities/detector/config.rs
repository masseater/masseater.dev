use std::collections::HashSet;

use anyhow::{Context, Result, bail};
use serde::Deserialize;
use serde::de::IgnoredAny;
use serde_json::Value;

use crate::shared::text;

const MAX_EXTEND_DEPTH: usize = 2;
const DEFAULT_DECODE_DEPTH: usize = 5;

#[derive(Debug, Deserialize, Default)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct Raw {
    #[serde(default, rename = "title")]
    _title: IgnoredAny,
    #[serde(default, rename = "description")]
    _description: IgnoredAny,
    #[serde(default, rename = "minVersion")]
    _min_version: IgnoredAny,
    #[serde(default)]
    prefilter: String,
    #[serde(default)]
    filter: String,
    #[serde(default)]
    rules: Vec<RuleConfig>,
    #[serde(default)]
    max_decode_depth: Option<usize>,
    #[serde(default)]
    extend: Extend,
}

#[derive(Debug, Deserialize, Default)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct Extend {
    #[serde(default)]
    path: String,
    #[serde(default)]
    use_default: bool,
    #[serde(default)]
    disabled_rules: Vec<String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct RuleConfig {
    pub id: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub regex: String,
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub keywords: Vec<String>,
    #[serde(default)]
    pub filter: String,
    #[serde(default)]
    pub skip_report: bool,
    #[serde(default)]
    pub specificity: i64,
    #[serde(default)]
    pub value_group: usize,
    #[serde(default)]
    pub confidence: String,
    #[serde(default)]
    pub components: Vec<ComponentConfig>,
    #[serde(default, rename = "tags")]
    _tags: IgnoredAny,
    #[serde(default, rename = "validate")]
    _validate: IgnoredAny,
    #[serde(default, rename = "analyze")]
    _analyze: IgnoredAny,
    #[serde(default, rename = "revoke")]
    _revoke: IgnoredAny,
    #[serde(default, rename = "tests")]
    _tests: IgnoredAny,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct ComponentConfig {
    pub id: String,
    #[serde(default)]
    pub within: String,
    #[serde(default)]
    pub optional: bool,
}

#[derive(Debug, Default)]
pub struct Config {
    pub prefilter: String,
    pub filter: String,
    pub rules: Vec<RuleConfig>,
    pub max_decode_depth: usize,
}

fn joined(base: String, current: String) -> String {
    match (base.trim().is_empty(), current.trim().is_empty()) {
        (true, _) => current,
        (_, true) => base,
        _ => format!("(\n{}\n) || (\n{}\n)", base.trim(), current.trim()),
    }
}

fn resolve(mut raw: Raw, depth: usize) -> Result<Raw> {
    let mut ids = HashSet::new();
    for rule in &raw.rules {
        if !ids.insert(rule.id.clone()) {
            bail!("duplicate rule ID {:?}", rule.id);
        }
    }
    if raw.extend.use_default {
        bail!(
            "h56m has no built-in rules; extend a preset file with extend.path instead of useDefault"
        );
    }
    if raw.extend.path.is_empty() {
        return Ok(raw);
    }
    if depth >= MAX_EXTEND_DEPTH {
        bail!("config extension exceeds maximum depth of {MAX_EXTEND_DEPTH}");
    }
    let path = std::mem::take(&mut raw.extend.path);
    let source =
        std::fs::read_to_string(&path).with_context(|| format!("load extended config {path:?}"))?;
    let base: Raw =
        toml::from_str(&source).with_context(|| format!("load extended config {path:?}"))?;
    let base =
        resolve(base, depth + 1).with_context(|| format!("load extended config {path:?}"))?;
    let disabled: HashSet<&String> = raw.extend.disabled_rules.iter().collect();
    let mut rules = std::mem::take(&mut raw.rules);
    for rule in base.rules {
        if !disabled.contains(&rule.id) && !ids.contains(&rule.id) {
            rules.push(rule);
        }
    }
    rules.sort_by(|a, b| a.id.cmp(&b.id));
    raw.rules = rules;
    raw.prefilter = joined(base.prefilter, raw.prefilter);
    raw.filter = joined(base.filter, raw.filter);
    raw.max_decode_depth = raw.max_decode_depth.or(base.max_decode_depth);
    Ok(raw)
}

fn validate(config: &Config) -> Result<()> {
    let ids: HashSet<&str> = config.rules.iter().map(|rule| rule.id.as_str()).collect();
    for rule in &config.rules {
        if rule.regex.is_empty() && rule.path.is_empty() {
            bail!("{}: rule needs a regex or a path", rule.id);
        }
        if rule.regex.is_empty() && !rule.components.is_empty() {
            bail!("{}: path-only rules cannot declare components", rule.id);
        }
        for pattern in [&rule.regex, &rule.path] {
            if !pattern.is_empty() {
                regex_syntax::Parser::new()
                    .parse(&text::go_regex(pattern))
                    .with_context(|| format!("{}: invalid regex {pattern:?}", rule.id))?;
            }
        }
        for component in &rule.components {
            if component.id == rule.id || !ids.contains(component.id.as_str()) {
                bail!("{}: unknown component rule {:?}", rule.id, component.id);
            }
        }
    }
    Ok(())
}

pub fn load(value: &Value) -> Result<Config> {
    let raw: Raw = serde_json::from_value(value.clone()).context("invalid h56m config")?;
    let raw = resolve(raw, 0)?;
    let mut config = Config {
        prefilter: raw.prefilter,
        filter: raw.filter,
        rules: raw.rules,
        max_decode_depth: raw.max_decode_depth.unwrap_or(DEFAULT_DECODE_DEPTH),
    };
    for rule in &mut config.rules {
        for keyword in &mut rule.keywords {
            *keyword = keyword.to_lowercase();
        }
    }
    validate(&config)?;
    Ok(config)
}

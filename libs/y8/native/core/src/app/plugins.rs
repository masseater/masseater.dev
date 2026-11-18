use std::collections::HashMap;
use std::path::Path;

use serde::Serialize;
use tracing::info_span;

use crate::features::check_agent_config::{AgentChecker, AgentLevel};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PluginSeverity {
    Error,
    Warning,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginDiagnostic {
    pub rule: String,
    pub line: usize,
    pub column: usize,
    pub message: String,
    pub detail: Option<String>,
    pub severity: PluginSeverity,
}

#[derive(Debug, Clone)]
pub struct PluginConfig {
    pub name: String,
    pub prefix: String,
    pub rules: HashMap<String, String>,
}

pub struct Finding {
    pub rule: String,
    pub line: usize,
    pub column: usize,
    pub message: String,
    pub detail: Option<String>,
    pub error: bool,
}

pub trait BuiltinPlugin: Send + Sync {
    fn check(&self, path: &str, text: &str) -> Vec<Finding>;
}

impl BuiltinPlugin for AgentChecker {
    fn check(&self, path: &str, text: &str) -> Vec<Finding> {
        AgentChecker::check(self, path, text)
            .into_iter()
            .map(|diagnostic| Finding {
                rule: diagnostic.rule,
                line: diagnostic.line,
                column: diagnostic.column,
                message: diagnostic.message,
                detail: diagnostic.suggestion,
                error: diagnostic.level == AgentLevel::Error,
            })
            .collect()
    }
}

const OFF: &str = "off";
const WARN: &str = "warn";

fn create(name: &str, root: &Path, disabled: &[String]) -> Option<Box<dyn BuiltinPlugin>> {
    match name {
        "agnix" => AgentChecker::new(root.to_path_buf(), disabled)
            .map(|checker| Box::new(checker) as Box<dyn BuiltinPlugin>),
        _ => None,
    }
}

struct Loaded {
    prefix: String,
    rules: HashMap<String, String>,
    plugin: Box<dyn BuiltinPlugin>,
}

pub struct Plugins {
    loaded: Vec<Loaded>,
}

impl Plugins {
    #[must_use]
    pub fn new(root: &Path, configs: Vec<PluginConfig>) -> Self {
        let loaded = configs
            .into_iter()
            .filter_map(|config| {
                let disabled: Vec<String> = config
                    .rules
                    .iter()
                    .filter(|(_, severity)| severity.as_str() == OFF)
                    .map(|(rule, _)| rule.clone())
                    .collect();
                let plugin = create(&config.name, root, &disabled)?;
                Some(Loaded {
                    prefix: config.prefix,
                    rules: config.rules,
                    plugin,
                })
            })
            .collect();
        Self { loaded }
    }

    #[must_use]
    pub fn check(&self, path: &str, text: &str) -> Vec<PluginDiagnostic> {
        self.loaded
            .iter()
            .flat_map(|loaded| {
                let _span = info_span!("y8.plugin", "y8.plugin" = loaded.prefix.as_str()).entered();
                loaded
                    .plugin
                    .check(path, text)
                    .into_iter()
                    .filter_map(|finding| diagnostic(loaded, finding))
            })
            .collect()
    }
}

fn diagnostic(loaded: &Loaded, finding: Finding) -> Option<PluginDiagnostic> {
    let severity = match loaded.rules.get(&finding.rule).map(String::as_str) {
        Some(OFF) => return None,
        Some(WARN) => PluginSeverity::Warning,
        Some(_) => PluginSeverity::Error,
        None if finding.error => PluginSeverity::Error,
        None => PluginSeverity::Warning,
    };
    Some(PluginDiagnostic {
        rule: format!("{}/{}", loaded.prefix, finding.rule),
        line: finding.line.max(1),
        column: finding.column.max(1),
        message: finding.message,
        detail: finding.detail,
        severity,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn agnix(rules: &[(&str, &str)]) -> Plugins {
        Plugins::new(
            &PathBuf::from("/repo"),
            vec![PluginConfig {
                name: "agnix".to_owned(),
                prefix: "agents".to_owned(),
                rules: rules
                    .iter()
                    .map(|(rule, severity)| ((*rule).to_owned(), (*severity).to_owned()))
                    .collect(),
            }],
        )
    }

    const SKILL: &str = "---\nname: Demo\ndescription: I help you.\n---\n\n# demo\n";

    #[test]
    fn names_findings_with_the_configured_prefix() {
        let found = agnix(&[]).check("skills/demo/SKILL.md", SKILL);
        assert!(!found.is_empty());
        assert!(found.iter().all(|d| d.rule.starts_with("agents/")));
    }

    #[test]
    fn applies_rule_severities() {
        let all = agnix(&[]).check("skills/demo/SKILL.md", SKILL);
        let first = all.first().expect("a finding");
        let id = first.rule.trim_start_matches("agents/").to_owned();
        let off = agnix(&[(&id, "off")]).check("skills/demo/SKILL.md", SKILL);
        assert!(off.iter().all(|d| d.rule != first.rule));
        let warned = agnix(&[(&id, "warn")]).check("skills/demo/SKILL.md", SKILL);
        assert!(
            warned
                .iter()
                .filter(|d| d.rule == first.rule)
                .all(|d| d.severity == PluginSeverity::Warning)
        );
    }

    #[test]
    fn ignores_unknown_plugins() {
        let plugins = Plugins::new(
            &PathBuf::from("/repo"),
            vec![PluginConfig {
                name: "nothing".to_owned(),
                prefix: "nothing".to_owned(),
                rules: HashMap::new(),
            }],
        );
        assert!(plugins.check("a.md", "# a\n").is_empty());
    }
}

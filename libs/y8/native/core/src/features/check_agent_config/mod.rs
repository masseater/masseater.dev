use std::path::{Path, PathBuf};

use agnix_core::{DiagnosticLevel, LintConfig, ValidatorRegistry, validate_content};
use serde::Serialize;
use tracing::info_span;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentDiagnostic {
    pub line: usize,
    pub column: usize,
    pub rule: String,
    pub message: String,
    pub suggestion: Option<String>,
    pub level: AgentLevel,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AgentLevel {
    Error,
    Warning,
    Info,
}

pub struct AgentChecker {
    root: PathBuf,
    config: LintConfig,
    registry: ValidatorRegistry,
}

impl AgentChecker {
    #[must_use]
    pub fn new(root: PathBuf, disabled: &[String]) -> Option<Self> {
        let mut builder = LintConfig::builder();
        builder.root_dir(root.clone());
        for rule in disabled {
            builder.disable_rule(rule.clone());
        }
        let config = builder.build_lenient().ok()?;
        Some(Self {
            root,
            config,
            registry: ValidatorRegistry::with_defaults(),
        })
    }

    #[must_use]
    pub fn check(&self, path: &str, text: &str) -> Vec<AgentDiagnostic> {
        let _span = info_span!("y8.agnix", "code.file.path" = path).entered();
        let absolute = self.root.join(Path::new(path));
        validate_content(&absolute, text, &self.config, &self.registry)
            .into_iter()
            .map(|diagnostic| AgentDiagnostic {
                line: diagnostic.line.max(1),
                column: diagnostic.column.max(1),
                rule: diagnostic.rule,
                message: diagnostic.message,
                suggestion: diagnostic.suggestion,
                level: match diagnostic.level {
                    DiagnosticLevel::Error => AgentLevel::Error,
                    DiagnosticLevel::Warning => AgentLevel::Warning,
                    DiagnosticLevel::Info => AgentLevel::Info,
                },
            })
            .collect()
    }
}

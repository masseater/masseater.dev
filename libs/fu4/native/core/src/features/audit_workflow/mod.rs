mod audit;
mod config;
mod finding;
mod github;
mod models;
mod registry;
mod state;
mod utils;

#[cfg(test)]
mod conformance;
#[cfg(test)]
mod online;

use camino::Utf8Path;
use serde::Deserialize;
use tracing::info_span;

use crate::shared::diagnostic::Diagnostic;
use crate::shared::yaml::Pos;

use finding::{Confidence, Finding, Persona, Severity};
use registry::input::{InputGroup, InputKind, Root};
use registry::{AuditRegistry, FindingRegistry};
use state::AuditState;

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AuditOptions {
    pub rules: Option<serde_json::Value>,
    pub persona: Persona,
    pub min_severity: Option<Severity>,
    pub min_confidence: Option<Confidence>,
    pub github_token: Option<String>,
    pub github_host: Option<String>,
}

pub struct AuditFile {
    pub path: String,
    pub text: String,
}

pub struct AuditReport {
    pub path: String,
    pub diagnostics: Vec<Diagnostic>,
}

fn message(finding: &Finding<'_>) -> String {
    let primary = finding.primary_location();
    let annotation: &str = &primary.symbolic.annotation;
    let mut message = if annotation.is_empty() {
        finding.desc.to_owned()
    } else {
        format!("{}: {annotation}", finding.desc)
    };
    if let Some(tip) = &finding.tip {
        message = format!("{message}. {tip}");
    }
    let link = primary.symbolic.link.as_deref().unwrap_or(finding.url);
    format!("{message} ({link})")
}

fn diagnostic(finding: &Finding<'_>) -> (String, Diagnostic) {
    let primary = finding.primary_location();
    let point = primary.concrete.location.start_point;
    (
        primary.symbolic.key.presentation_path().to_owned(),
        Diagnostic::new(
            Pos {
                line: point.row + 1,
                col: point.column + 1,
            },
            finding.ident,
            message(finding),
        ),
    )
}

#[must_use]
pub fn is_workflow(path: &str) -> bool {
    InputKind::from_path(Utf8Path::new(path)) == Some(InputKind::Workflow)
}

fn group_of(root: &Utf8Path, options: &AuditOptions) -> Result<InputGroup, String> {
    let config = match &options.rules {
        Some(rules) => config::Config::load(&serde_json::json!({ "rules": rules }).to_string())
            .map_err(|error| format!("invalid fu4 audit rules: {error}"))?,
        None => config::Config::default(),
    };
    InputGroup::new(config, Some(Root::new(root))).map_err(|error| error.to_string())
}

fn findings_in<'a>(
    group: &'a InputGroup,
    options: &AuditOptions,
    state: &AuditState,
) -> Vec<Finding<'a>> {
    let audits = AuditRegistry::default_audits(state);
    let mut findings = FindingRegistry::new(
        group.config(),
        options.min_severity,
        options.min_confidence,
        options.persona,
    );
    for input in group.inputs() {
        for (ident, audit) in audits.iter_audits() {
            let _audit = info_span!("fu4.audit_rule", "fu4.rule" = *ident).entered();
            match audit.audit(ident, input, group) {
                Ok(results) => findings.extend(results),
                Err(error) => tracing::warn!("{error}"),
            }
        }
    }
    findings.into_findings()
}

pub fn audit(
    root: &str,
    files: Vec<AuditFile>,
    options: &AuditOptions,
) -> Result<Vec<AuditReport>, String> {
    audit_in(&AuditState::new(options)?, root, files, options)
}

fn audit_in(
    state: &AuditState,
    root: &str,
    files: Vec<AuditFile>,
    options: &AuditOptions,
) -> Result<Vec<AuditReport>, String> {
    let _span = info_span!("fu4.audit", "fu4.files" = files.len()).entered();
    let root = Utf8Path::new(root);
    let mut group = group_of(root, options)?;
    let mut reports = Vec::new();
    for file in files {
        let Some(kind) = InputKind::from_path(Utf8Path::new(&file.path)) else {
            continue;
        };
        let key = group.key(root.join(&file.path));
        if group.register(kind, &file.text, key).is_err() {
            continue;
        }
        reports.push(AuditReport {
            path: file.path,
            diagnostics: Vec::new(),
        });
    }

    for (path, diagnostic) in findings_in(&group, options, state).iter().map(diagnostic) {
        let relative = Utf8Path::new(&path)
            .strip_prefix(root)
            .map_or(path.clone(), std::string::ToString::to_string);
        if let Some(report) = reports.iter_mut().find(|report| report.path == relative) {
            report.diagnostics.push(diagnostic);
        }
    }
    for report in &mut reports {
        report
            .diagnostics
            .sort_by(|a, b| a.pos.cmp(&b.pos).then_with(|| a.kind.cmp(&b.kind)));
    }
    Ok(reports)
}

#[cfg(test)]
mod tests {
    use super::{AuditFile, AuditOptions, audit, is_workflow};

    const WORKFLOW: &str = "on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ${{ github.event.issue.title }}\n";

    fn file(path: &str, text: &str) -> AuditFile {
        AuditFile {
            path: path.to_owned(),
            text: text.to_owned(),
        }
    }

    #[test]
    fn reports_findings_under_the_given_relative_path() {
        let reports = audit(
            "/repo",
            vec![file(".github/workflows/ci.yml", WORKFLOW)],
            &AuditOptions::default(),
        )
        .expect("audits run");
        assert_eq!(reports.len(), 1);
        assert_eq!(reports[0].path, ".github/workflows/ci.yml");
        let kinds: Vec<&str> = reports[0]
            .diagnostics
            .iter()
            .map(|d| d.kind.as_ref())
            .collect();
        assert!(kinds.contains(&"template-injection"), "{kinds:?}");
        assert!(kinds.contains(&"excessive-permissions"), "{kinds:?}");
    }

    #[test]
    fn skips_files_that_are_not_yaml_or_do_not_parse() {
        let reports = audit(
            "/repo",
            vec![
                file("README.md", "# readme"),
                file(".github/workflows/broken.yml", "jobs: ["),
            ],
            &AuditOptions::default(),
        )
        .expect("audits run");
        assert!(reports.is_empty());
    }

    #[test]
    fn rejects_rules_that_are_not_a_valid_config() {
        let options = AuditOptions {
            rules: Some(serde_json::json!({ "template-injection": { "unknown": true } })),
            ..AuditOptions::default()
        };
        assert!(audit("/repo", Vec::new(), &options).is_err());
    }

    #[test]
    fn tells_workflows_from_other_inputs() {
        assert!(is_workflow(".github/workflows/ci.yml"));
        assert!(!is_workflow("actions/setup/action.yml"));
        assert!(!is_workflow(".github/dependabot.yml"));
        assert!(!is_workflow("README.md"));
    }
}

use std::sync::LazyLock;

use github_actions_models::common::{
    EnvValue, RepositoryUses, Uses,
    expr::{ExplicitExpr, LoE},
};
use itertools::Itertools as _;

use super::{Audit, AuditLoadError, audit_meta};
use crate::features::audit_workflow::{
    audit::AuditError,
    finding::{Confidence, Finding, Persona, Severity},
    github::{Client, ClientError},
    models::{StepBodyCommon, StepCommon, uses::RepositoryUsesExt as _, version::Version},
    state::AuditState,
    utils::split_patterns,
};

static V6: LazyLock<Version> = LazyLock::new(|| Version::parse("v6").unwrap());

pub(crate) struct Artipacked {
    client: Option<Client>,
}

audit_meta!(
    Artipacked,
    "artipacked",
    "credential persistence through GitHub Actions artifacts"
);

impl Artipacked {
    fn is_checkout_v6_or_higher(&self, uses: &RepositoryUses) -> Result<Option<bool>, ClientError> {
        let version = if uses.ref_is_commit() {
            match self.client {
                Some(ref client) => {
                    let tag = client.longest_tag_for_commit(
                        &uses.into(),
                        uses.subpath(),
                        uses.git_ref(),
                    )?;

                    match tag {
                        Some(tag) => tag.name,
                        None => return Ok(None),
                    }
                }
                None => return Ok(None),
            }
        } else {
            uses.git_ref().to_string()
        };

        let Ok(version) = Version::parse(&version) else {
            return Ok(None);
        };

        Ok(Some(version >= *V6))
    }

    fn determine_severity(
        is_v6_or_higher: Option<bool>,
        has_no_vulnerable_uploads: bool,
    ) -> Severity {
        if is_v6_or_higher == Some(true) {
            if has_no_vulnerable_uploads {
                Severity::Low
            } else {
                Severity::Medium
            }
        } else if has_no_vulnerable_uploads {
            Severity::Medium
        } else {
            Severity::High
        }
    }

    fn process_steps<'doc>(
        &self,
        steps: impl Iterator<Item = impl StepCommon<'doc>>,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let mut vulnerable_checkouts = vec![];
        let mut vulnerable_uploads = vec![];
        for step in steps {
            let Some(StepBodyCommon::Uses {
                uses: Uses::Repository(uses),
                with,
            }) = &step.body()
            else {
                continue;
            };

            if uses.matches("actions/checkout") {
                let with = match with {
                    LoE::Literal(with) => with,
                    LoE::Expr(_) => {
                        continue;
                    }
                };

                let is_v6_or_higher = self.is_checkout_v6_or_higher(uses).map_err(Self::err)?;
                match with
                    .get("persist-credentials")
                    .map(std::string::ToString::to_string)
                    .as_deref()
                {
                    Some("false") => {}
                    Some("true") => {
                        vulnerable_checkouts.push((step, Persona::Auditor, is_v6_or_higher));
                    }
                    Some(v) if ExplicitExpr::from_curly(v).is_some() => {
                        vulnerable_checkouts.push((step, Persona::Pedantic, is_v6_or_higher));
                    }
                    _ => vulnerable_checkouts.push((step, Persona::default(), is_v6_or_higher)),
                }
            } else if uses.matches("actions/upload-artifact") {
                let LoE::Literal(with) = with else {
                    continue;
                };

                let Some(EnvValue::String(path)) = with.get("path") else {
                    continue;
                };

                let dangerous_paths = Self::dangerous_artifact_patterns(path);
                if !dangerous_paths.is_empty() {
                    vulnerable_uploads.push(step);
                }
            }
        }

        if vulnerable_uploads.is_empty() {
            for (checkout, persona, is_v6_or_higher) in &vulnerable_checkouts {
                let severity =
                    Self::determine_severity(*is_v6_or_higher, vulnerable_uploads.is_empty());

                findings.push(
                    Self::finding()
                        .severity(severity)
                        .confidence(Confidence::Low)
                        .persona(*persona)
                        .add_location(
                            checkout
                                .location()
                                .primary()
                                .annotated("does not set persist-credentials: false"),
                        )
                        .build(checkout)?,
                );
            }
        } else {
            for ((checkout, persona, is_v6_or_higher), upload) in vulnerable_checkouts
                .iter()
                .cartesian_product(vulnerable_uploads.iter())
            {
                if checkout.ord() < upload.ord() {
                    let severity =
                        Self::determine_severity(*is_v6_or_higher, vulnerable_uploads.is_empty());

                    findings.push(
                        Self::finding()
                            .severity(severity)
                            .confidence(Confidence::High)
                            .persona(*persona)
                            .add_location(
                                checkout
                                    .location()
                                    .primary()
                                    .annotated("does not set persist-credentials: false"),
                            )
                            .add_location(
                                upload
                                    .location()
                                    .annotated("may leak the credentials persisted above"),
                            )
                            .build(checkout)?,
                    );
                }
            }
        }

        Ok(findings)
    }

    fn dangerous_artifact_patterns(path: &str) -> Vec<&str> {
        let mut patterns = vec![];
        for path in split_patterns(path) {
            match path {
                "." | "./" | ".." | "../" => patterns.push(path),
                path => match ExplicitExpr::from_curly(path) {
                    Some(expr) if expr.as_bare().contains("github.workspace") => {
                        patterns.push(path);
                    }

                    _ => {}
                },
            }
        }

        patterns
    }
}

impl Audit for Artipacked {
    fn new(state: &AuditState) -> Result<Self, AuditLoadError> {
        let client = if state.no_online_audits {
            None
        } else {
            state.gh_client.clone()
        };

        Ok(Self { client })
    }

    fn audit_action<'doc>(
        &self,
        action: &'doc crate::features::audit_workflow::models::action::Action,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let Some(steps) = action.steps() else {
            return Ok(vec![]);
        };

        self.process_steps(steps)
    }

    fn audit_normal_job<'doc>(
        &self,
        job: &super::NormalJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        self.process_steps(job.steps())
    }
}

#[cfg(test)]
mod tests {
    use github_actions_models::common::RepositoryUses;

    use super::*;

    #[test]
    fn test_is_checkout_v6_or_higher_offline() {
        let v6 = RepositoryUses::parse("actions/checkout@v6").unwrap();
        let v6_0 = RepositoryUses::parse("actions/checkout@v6.0").unwrap();
        let v6_1_0 = RepositoryUses::parse("actions/checkout@v6.1.0").unwrap();
        let v7 = RepositoryUses::parse("actions/checkout@v7").unwrap();
        let v10 = RepositoryUses::parse("actions/checkout@v10").unwrap();

        let artipacked = Artipacked { client: None };

        assert_eq!(
            artipacked.is_checkout_v6_or_higher(&v6).unwrap(),
            Some(true)
        );
        assert_eq!(
            artipacked.is_checkout_v6_or_higher(&v6_0).unwrap(),
            Some(true)
        );
        assert_eq!(
            artipacked.is_checkout_v6_or_higher(&v6_1_0).unwrap(),
            Some(true)
        );
        assert_eq!(
            artipacked.is_checkout_v6_or_higher(&v7).unwrap(),
            Some(true)
        );
        assert_eq!(
            artipacked.is_checkout_v6_or_higher(&v10).unwrap(),
            Some(true)
        );

        let v4 = RepositoryUses::parse("actions/checkout@v4").unwrap();
        let v5 = RepositoryUses::parse("actions/checkout@v5").unwrap();
        let v5_9 = RepositoryUses::parse("actions/checkout@v5.9").unwrap();

        assert_eq!(
            artipacked.is_checkout_v6_or_higher(&v4).unwrap(),
            Some(false)
        );
        assert_eq!(
            artipacked.is_checkout_v6_or_higher(&v5).unwrap(),
            Some(false)
        );
        assert_eq!(
            artipacked.is_checkout_v6_or_higher(&v5_9).unwrap(),
            Some(false)
        );

        let commit_sha =
            RepositoryUses::parse("actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683")
                .unwrap();
        assert_eq!(
            artipacked.is_checkout_v6_or_higher(&commit_sha).unwrap(),
            None
        );

        let invalid = RepositoryUses::parse("actions/checkout@main").unwrap();
        assert_eq!(artipacked.is_checkout_v6_or_higher(&invalid).unwrap(), None);
    }

    #[test]
    fn test_determine_severity() {
        const IS_V6_OR_HIGHER: Option<bool> = Some(true);
        const IS_OLDER_VERSION: Option<bool> = Some(false);
        const UNKNOWN_VERSION: Option<bool> = None;
        const HAS_NO_VULNERABLE_UPLOADS: bool = true;
        const HAS_VULNERABLE_UPLOADS: bool = false;

        assert_eq!(
            Artipacked::determine_severity(IS_V6_OR_HIGHER, HAS_NO_VULNERABLE_UPLOADS),
            Severity::Low
        );

        assert_eq!(
            Artipacked::determine_severity(IS_V6_OR_HIGHER, HAS_VULNERABLE_UPLOADS),
            Severity::Medium
        );

        assert_eq!(
            Artipacked::determine_severity(IS_OLDER_VERSION, HAS_NO_VULNERABLE_UPLOADS),
            Severity::Medium
        );

        assert_eq!(
            Artipacked::determine_severity(IS_OLDER_VERSION, HAS_VULNERABLE_UPLOADS),
            Severity::High
        );

        assert_eq!(
            Artipacked::determine_severity(UNKNOWN_VERSION, HAS_NO_VULNERABLE_UPLOADS),
            Severity::Medium
        );

        assert_eq!(
            Artipacked::determine_severity(UNKNOWN_VERSION, HAS_VULNERABLE_UPLOADS),
            Severity::High
        );
    }
}

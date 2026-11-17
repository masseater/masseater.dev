use std::{collections::HashSet, sync::LazyLock};

use subfeature::Subfeature;

use crate::features::audit_workflow::{
    audit::{Audit, AuditError, AuditLoadError, audit_meta},
    finding::{Confidence, Finding, Severity, location::Locatable as _},
    models::pre_commit,
    state::AuditState,
};

static INSECURE_SCHEMES: LazyLock<HashSet<&str>> =
    LazyLock::new(|| ["http", "git"].into_iter().collect());

pub(crate) struct InsecureURLScheme;

audit_meta!(
    InsecureURLScheme,
    "insecure-url-scheme",
    "use of an insecure scheme within a URL"
);

impl Audit for InsecureURLScheme {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_pre_commit_config_repo<'doc>(
        &self,
        repo: &pre_commit::Repo<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let Some(remote) = repo.repo() else {
            return Ok(findings);
        };

        if !INSECURE_SCHEMES.contains(&remote.repo.scheme()) {
            return Ok(findings);
        }

        findings.push(
            Self::finding()
                .confidence(Confidence::High)
                .severity(Severity::High)
                .add_location(
                    repo.location()
                        .primary()
                        .with_keys(["repo".into()])
                        .annotated(format!(
                            "repository URL uses an insecure scheme: {scheme:?}",
                            scheme = remote.repo.scheme()
                        ))
                        .subfeature(Subfeature::new(0, remote.repo.as_str())),
                )
                .build(repo)?,
        );

        Ok(findings)
    }
}

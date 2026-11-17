use anyhow::anyhow;
use github_actions_models::common::Uses;

use super::{Audit, AuditLoadError, audit_meta};
use crate::features::audit_workflow::{
    audit::AuditError,
    config::Config,
    finding::{Confidence, Finding, Severity},
    github,
    models::{StepCommon, action::CompositeStep, repo_ref::RepoRef, workflow::Step},
    state::AuditState,
};

pub(crate) struct KnownVulnerableActions {
    client: github::Client,
}

audit_meta!(
    KnownVulnerableActions,
    "known-vulnerable-actions",
    "action has a known vulnerability"
);

impl KnownVulnerableActions {
    fn action_known_vulnerabilities<'r>(
        &self,
        repo_ref: impl Into<RepoRef<'r>>,
    ) -> Result<Vec<(Severity, String)>, AuditError> {
        let repo_ref = repo_ref.into();
        let Some(slug) = repo_ref.slug() else {
            return Ok(vec![]);
        };

        let version = match &repo_ref.git_ref() {
            version if !repo_ref.ref_is_commit() => {
                let Some(commit_ref) = self.client.lookup_ref(&slug, version).map_err(Self::err)?
                else {
                    return Ok(vec![]);
                };

                match self
                    .client
                    .longest_tag_for_commit(&slug, repo_ref.subpath(), commit_ref.commit())
                    .map_err(Self::err)?
                {
                    Some(tag) => tag.name,

                    None => version.to_string(),
                }
            }

            commit_ref => {
                match self
                    .client
                    .longest_tag_for_commit(&slug, repo_ref.subpath(), commit_ref)
                    .map_err(Self::err)?
                {
                    Some(tag) => tag.name,

                    None => return Ok(vec![]),
                }
            }
        };

        let advisories = self
            .client
            .gha_advisories(&slug, &version)
            .map_err(Self::err)?;

        let mut results = vec![];

        for advisory in advisories {
            let severity = match advisory.severity.as_str() {
                "low" => Severity::Low,
                "medium" => Severity::Medium,
                _ => Severity::High,
            };
            results.push((severity, advisory.ghsa_id));
        }

        Ok(results)
    }

    fn process_step<'doc>(
        &self,
        step: &impl StepCommon<'doc>,
        config: &Config,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let Some(Uses::Repository(uses)) = step.uses() else {
            return Ok(findings);
        };

        for (severity, id) in self.action_known_vulnerabilities(uses)? {
            if config.known_vulnerable_actions.allow.contains(&id) {
                tracing::trace!("{id} is allowed in configuration; skipping");
                continue;
            }

            let finding_builder = Self::finding()
                .confidence(Confidence::High)
                .severity(severity)
                .add_location(
                    step.location()
                        .primary()
                        .with_keys(["uses".into()])
                        .with_url(format!("https://github.com/advisories/{id}"))
                        .annotated(id),
                );

            findings.push(finding_builder.build(step).map_err(Self::err)?);
        }

        Ok(findings)
    }
}

impl Audit for KnownVulnerableActions {
    fn new(state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        if state.no_online_audits {
            return Err(AuditLoadError::Skip(anyhow!(
                "offline audits only requested"
            )));
        }

        state
            .gh_client
            .clone()
            .ok_or_else(|| AuditLoadError::Skip(anyhow!("can't run without a GitHub API token")))
            .map(|client| Self { client })
    }

    fn audit_step<'doc>(
        &self,
        step: &Step<'doc>,
        group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        self.process_step(step, group.config())
    }

    fn audit_composite_step<'doc>(
        &self,
        step: &CompositeStep<'doc>,
        group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        self.process_step(step, group.config())
    }
}

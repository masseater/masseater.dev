use std::{collections::HashSet, sync::LazyLock};

use github_actions_models::common::Uses;
use subfeature::Subfeature;

use crate::features::audit_workflow::{
    audit::{Audit, AuditError, AuditLoadError, audit_meta},
    finding::{Confidence, Finding, FindingBuilder, Persona, Severity, location::Locatable as _},
    models::{
        StepCommon as _,
        action::CompositeStep,
        pre_commit::PreCommitConfig,
        repo_ref::RepoRef,
        workflow::{ReusableWorkflowCallJob, Step},
    },
    state::AuditState,
};

static ARCHIVED_REPOS: LazyLock<HashSet<&str>> = LazyLock::new(|| {
    include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/data/zizmor/archived-repos.txt"
    ))
    .lines()
    .collect()
});

pub(crate) struct ArchivedUses;

audit_meta!(
    ArchivedUses,
    "archived-uses",
    "action or reusable workflow from archived repository"
);

impl ArchivedUses {
    pub(crate) fn uses_is_archived<'doc>(
        repo_ref: impl Into<RepoRef<'doc>>,
    ) -> Option<FindingBuilder<'doc>> {
        let repo_ref = repo_ref.into();
        let slug = repo_ref.slug()?;

        let normalized = format!(
            "{owner}/{repo}",
            owner = slug.owner().to_lowercase(),
            repo = slug.repo().to_lowercase()
        );

        ARCHIVED_REPOS.contains(normalized.as_str()).then(|| {
            Self::finding()
                .confidence(Confidence::High)
                .severity(Severity::Medium)
                .persona(Persona::Regular)
        })
    }
}

impl Audit for ArchivedUses {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_step<'doc>(
        &self,
        step: &Step<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        if let Some(Uses::Repository(uses)) = step.uses()
            && let Some(finding) = Self::uses_is_archived(uses)
        {
            findings.push(
                finding
                    .add_location(step.location_with_grip())
                    .add_location(
                        step.location()
                            .with_keys(["uses".into()])
                            .subfeature(Subfeature::new(0, uses.slug()))
                            .annotated("repository is archived")
                            .primary(),
                    )
                    .build(step)?,
            );
        }

        Ok(findings)
    }

    fn audit_composite_step<'doc>(
        &self,
        step: &CompositeStep<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        if let Some(Uses::Repository(uses)) = step.uses()
            && let Some(finding) = Self::uses_is_archived(uses)
        {
            findings.push(
                finding
                    .add_location(step.location_with_grip())
                    .add_location(
                        step.location()
                            .with_keys(["uses".into()])
                            .subfeature(Subfeature::new(0, uses.slug()))
                            .annotated("repository is archived")
                            .primary(),
                    )
                    .build(step)?,
            );
        }

        Ok(findings)
    }

    fn audit_reusable_job<'doc>(
        &self,
        job: &ReusableWorkflowCallJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        if let Uses::Repository(uses) = &job.uses
            && let Some(finding) = Self::uses_is_archived(uses)
        {
            findings.push(
                finding
                    .add_location(job.location_with_grip())
                    .add_location(
                        job.location()
                            .with_keys(["uses".into()])
                            .subfeature(Subfeature::new(0, uses.slug()))
                            .annotated("repository is archived")
                            .primary(),
                    )
                    .build(job)?,
            );
        }

        Ok(findings)
    }

    fn audit_pre_commit_config<'doc>(
        &self,
        pre_commit: &'doc PreCommitConfig,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        for repo in pre_commit.repos() {
            let Some(remote) = repo.repo() else {
                continue;
            };

            if let Some(finding) = Self::uses_is_archived(remote) {
                findings.push(
                    finding
                        .add_location(repo.location_with_grip())
                        .add_location(
                            repo.location()
                                .with_keys(["repo".into()])
                                .subfeature(Subfeature::new(0, remote.repo.as_str()))
                                .annotated("repository is archived")
                                .primary(),
                        )
                        .build(pre_commit)?,
                );
            }
        }

        Ok(findings)
    }
}

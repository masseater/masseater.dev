use std::borrow::Cow;

use anyhow::anyhow;
use github_actions_models::common::Uses;
use subfeature::Subfeature;

use super::{Audit, AuditLoadError, Job, audit_meta};
use crate::features::audit_workflow::{
    audit::AuditError,
    finding::{Confidence, Finding, Severity, location::Locatable as _},
    github::{self, ComparisonStatus},
    models::{
        StepCommon as _,
        pre_commit::PreCommitConfig,
        repo_ref::{RepoRef, Slug},
        workflow::Workflow,
    },
    state::AuditState,
};

const IMPOSTOR_ANNOTATION: &str = "uses a commit that doesn't belong to the specified org/repo";

pub(crate) struct ImpostorCommit {
    pub(crate) client: github::Client,
}

audit_meta!(
    ImpostorCommit,
    "impostor-commit",
    "commit with no history in referenced repository"
);

enum IntermediateDetermination {
    NotImpostor,

    Impostor,

    Indeterminate,
}

impl ImpostorCommit {
    fn named_ref_contains_commit(
        &self,
        slug: &Slug<'_>,
        base_ref: &str,
        head_ref: &str,
    ) -> Result<bool, AuditError> {
        Ok(
            match self
                .client
                .compare_commits(slug, base_ref, head_ref)
                .map_err(Self::err)?
            {
                Some(comp) => {
                    matches!(comp, ComparisonStatus::Behind | ComparisonStatus::Identical)
                }

                None => false,
            },
        )
    }

    fn fastest_path_impostor_check(
        tags: &[github::Tag],
        branches: &[github::Branch],
        candidate_sha: &str,
    ) -> IntermediateDetermination {
        for tag in tags {
            if tag.commit.sha == candidate_sha {
                return IntermediateDetermination::NotImpostor;
            }
        }

        for branch in branches {
            if branch.commit.sha == candidate_sha {
                return IntermediateDetermination::NotImpostor;
            }
        }

        IntermediateDetermination::Indeterminate
    }

    fn fast_path_impostor_check(
        &self,
        slug: &Slug<'_>,
        candidate_sha: &str,
    ) -> IntermediateDetermination {
        match self.client.branch_commits(slug, candidate_sha) {
            Ok(branch_commits) => {
                if branch_commits.is_empty() {
                    IntermediateDetermination::Impostor
                } else {
                    IntermediateDetermination::NotImpostor
                }
            }
            Err(e) => {
                tracing::warn!("fast path impostor check failed for {slug}: {e}");
                IntermediateDetermination::Indeterminate
            }
        }
    }

    fn combined_fast_paths_impostor_check(
        &self,
        slug: &Slug<'_>,
        tags: &[github::Tag],
        branches: &[github::Branch],
        candidate_sha: &str,
    ) -> IntermediateDetermination {
        match Self::fastest_path_impostor_check(tags, branches, candidate_sha) {
            IntermediateDetermination::Indeterminate => {
                self.fast_path_impostor_check(slug, candidate_sha)
            }
            determination => determination,
        }
    }

    fn slow_path_impostor_check(
        &self,
        slug: &Slug<'_>,
        tags: &[github::Tag],
        branches: &[github::Branch],
        candidate_sha: &str,
    ) -> Result<IntermediateDetermination, AuditError> {
        for branch in branches {
            if self.named_ref_contains_commit(
                slug,
                &format!("refs/heads/{}", branch.name),
                candidate_sha,
            )? {
                return Ok(IntermediateDetermination::NotImpostor);
            }
        }

        for tag in tags {
            if self.named_ref_contains_commit(
                slug,
                &format!("refs/tags/{}", tag.name),
                candidate_sha,
            )? {
                return Ok(IntermediateDetermination::NotImpostor);
            }
        }

        Ok(IntermediateDetermination::Indeterminate)
    }

    fn impostor<'r>(&self, repo_ref: impl Into<RepoRef<'r>>) -> Result<bool, AuditError> {
        let repo_ref = repo_ref.into();
        let Some(slug) = repo_ref.slug() else {
            return Ok(false);
        };

        let Some(initial_candidate_sha) = repo_ref.commit_ref() else {
            return Ok(false);
        };

        let tags = self.client.list_tags(&slug).map_err(Self::err)?;

        let branches = self.client.list_branches(&slug).map_err(Self::err)?;

        match self.combined_fast_paths_impostor_check(
            &slug,
            &tags,
            &branches,
            initial_candidate_sha,
        ) {
            IntermediateDetermination::NotImpostor => return Ok(false),
            IntermediateDetermination::Impostor => return Ok(true),
            IntermediateDetermination::Indeterminate => {}
        }

        let final_candidate_sha: Cow<'_, str> = match self
            .client
            .tag_sha_to_commit_sha(&slug, initial_candidate_sha)
            .map_err(Self::err)?
        {
            Some(sha) => sha.into(),
            None => initial_candidate_sha.into(),
        };

        if initial_candidate_sha != final_candidate_sha {
            match self.combined_fast_paths_impostor_check(
                &slug,
                &tags,
                &branches,
                &final_candidate_sha,
            ) {
                IntermediateDetermination::NotImpostor => return Ok(false),
                IntermediateDetermination::Impostor => return Ok(true),
                IntermediateDetermination::Indeterminate => {}
            }
        }

        match self.slow_path_impostor_check(&slug, &tags, &branches, &final_candidate_sha)? {
            IntermediateDetermination::NotImpostor => Ok(false),

            _ => Ok(true),
        }
    }
}

impl Audit for ImpostorCommit {
    fn new(state: &AuditState) -> Result<Self, AuditLoadError> {
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

    fn audit_workflow<'doc>(
        &self,
        workflow: &'doc Workflow,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        for job in workflow.jobs() {
            match job {
                Job::NormalJob(normal) => {
                    for step in normal.steps() {
                        let Some(Uses::Repository(uses)) = step.uses() else {
                            continue;
                        };

                        if self.impostor(uses)? {
                            let finding_builder = Self::finding()
                                .severity(Severity::High)
                                .confidence(Confidence::High)
                                .add_location(step.location_with_grip())
                                .add_location(
                                    step.location()
                                        .with_keys(["uses".into()])
                                        .subfeature(Subfeature::new(0, uses.raw()))
                                        .primary()
                                        .annotated(IMPOSTOR_ANNOTATION),
                                );

                            findings.push(finding_builder.build(workflow).map_err(Self::err)?);
                        }
                    }
                }
                Job::ReusableWorkflowCallJob(reusable) => {
                    let Uses::Repository(uses) = &reusable.uses else {
                        continue;
                    };

                    if self.impostor(uses)? {
                        let finding_builder = Self::finding()
                            .severity(Severity::High)
                            .confidence(Confidence::High)
                            .add_location(reusable.location_with_grip())
                            .add_location(
                                reusable
                                    .location()
                                    .with_keys(["uses".into()])
                                    .subfeature(Subfeature::new(0, uses.raw()))
                                    .primary()
                                    .annotated(IMPOSTOR_ANNOTATION),
                            );

                        findings.push(finding_builder.build(workflow).map_err(Self::err)?);
                    }
                }
            }
        }

        Ok(findings)
    }

    fn audit_composite_step<'a>(
        &self,
        step: &super::CompositeStep<'a>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'a>>, AuditError> {
        let mut findings = vec![];
        let Some(Uses::Repository(uses)) = step.uses() else {
            return Ok(findings);
        };

        if self.impostor(uses)? {
            let finding_builder = Self::finding()
                .severity(Severity::High)
                .confidence(Confidence::High)
                .add_location(step.location_with_grip())
                .add_location(
                    step.location()
                        .with_keys(["uses".into()])
                        .subfeature(Subfeature::new(0, uses.raw()))
                        .primary()
                        .annotated(IMPOSTOR_ANNOTATION),
                );

            findings.push(finding_builder.build(step).map_err(Self::err)?);
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

            if self.impostor(remote)? {
                findings.push(
                    Self::finding()
                        .severity(Severity::High)
                        .confidence(Confidence::High)
                        .add_location(repo.location_with_grip())
                        .add_location(
                            repo.location()
                                .with_keys(["rev".into()])
                                .annotated(IMPOSTOR_ANNOTATION)
                                .primary(),
                        )
                        .build(pre_commit)?,
                );
            }
        }

        Ok(findings)
    }
}

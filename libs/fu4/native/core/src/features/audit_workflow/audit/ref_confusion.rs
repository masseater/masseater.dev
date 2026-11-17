use anyhow::anyhow;
use github_actions_models::common::Uses;
use subfeature::Subfeature;

use super::{Audit, AuditLoadError, Job, audit_meta};
use crate::features::audit_workflow::audit::AuditError;
use crate::features::audit_workflow::finding::Finding;
use crate::features::audit_workflow::finding::location::Locatable as _;
use crate::features::audit_workflow::models::pre_commit::PreCommitConfig;
use crate::features::audit_workflow::models::repo_ref::RepoRef;
use crate::features::audit_workflow::models::{StepCommon as _, action::CompositeStep};
use crate::features::audit_workflow::{
    finding::{Confidence, Severity},
    github,
    state::AuditState,
};

const REF_CONFUSION_ANNOTATION: &str =
    "uses a ref that's provided by both the branch and tag namespaces";

pub(crate) struct RefConfusion {
    client: github::Client,
}

audit_meta!(
    RefConfusion,
    "ref-confusion",
    "git ref for action with ambiguous ref type"
);

impl RefConfusion {
    fn confusable<'r>(&self, uses: impl Into<RepoRef<'r>>) -> Result<bool, AuditError> {
        let uses = uses.into();

        let Some(sym_ref) = uses.symbolic_ref() else {
            return Ok(false);
        };

        let Some(slug) = uses.slug() else {
            return Ok(false);
        };

        let branches_match = self.client.has_branch(&slug, sym_ref).map_err(Self::err)?;
        let tags_match = self.client.has_tag(&slug, sym_ref).map_err(Self::err)?;

        Ok(branches_match && tags_match)
    }
}

impl Audit for RefConfusion {
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

    fn audit_workflow<'doc>(
        &self,
        workflow: &'doc crate::features::audit_workflow::models::workflow::Workflow,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<crate::features::audit_workflow::finding::Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        for job in workflow.jobs() {
            match job {
                Job::NormalJob(normal) => {
                    for step in normal.steps() {
                        let Some(Uses::Repository(uses)) = step.uses() else {
                            continue;
                        };

                        if self.confusable(uses)? {
                            findings.push(
                                Self::finding()
                                    .severity(Severity::Medium)
                                    .confidence(Confidence::High)
                                    .add_location(
                                        step.location()
                                            .primary()
                                            .with_keys(["uses".into()])
                                            .annotated(REF_CONFUSION_ANNOTATION),
                                    )
                                    .build(workflow)
                                    .map_err(Self::err)?,
                            );
                        }
                    }
                }
                Job::ReusableWorkflowCallJob(reusable) => {
                    let Uses::Repository(uses) = &reusable.uses else {
                        continue;
                    };

                    if self.confusable(uses)? {
                        findings.push(
                            Self::finding()
                                .severity(Severity::Medium)
                                .confidence(Confidence::High)
                                .add_location(
                                    reusable
                                        .location()
                                        .primary()
                                        .annotated(REF_CONFUSION_ANNOTATION),
                                )
                                .build(workflow)
                                .map_err(Self::err)?,
                        );
                    }
                }
            }
        }

        Ok(findings)
    }

    fn audit_composite_step<'a>(
        &self,
        step: &CompositeStep<'a>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'a>>, AuditError> {
        let mut findings = vec![];

        let Some(Uses::Repository(uses)) = step.uses() else {
            return Ok(findings);
        };

        if self.confusable(uses)? {
            findings.push(
                Self::finding()
                    .severity(Severity::Medium)
                    .confidence(Confidence::High)
                    .add_location(
                        step.location()
                            .primary()
                            .with_keys(["uses".into()])
                            .annotated(REF_CONFUSION_ANNOTATION),
                    )
                    .build(step)
                    .map_err(Self::err)?,
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

            if self.confusable(remote)? {
                findings.push(
                    Self::finding()
                        .severity(Severity::Medium)
                        .confidence(Confidence::High)
                        .add_location(
                            repo.location()
                                .with_keys(["repo".into()])
                                .subfeature(Subfeature::new(0, remote.repo.as_str()))
                                .annotated("this repo"),
                        )
                        .add_location(
                            repo.location()
                                .primary()
                                .with_keys(["rev".into()])
                                .subfeature(Subfeature::new(0, remote.rev.as_str()))
                                .annotated(REF_CONFUSION_ANNOTATION),
                        )
                        .build(pre_commit)?,
                );
            }
        }

        Ok(findings)
    }
}

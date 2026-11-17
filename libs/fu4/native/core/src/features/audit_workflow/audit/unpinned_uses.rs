use github_actions_models::common::Uses;
use subfeature::Subfeature;

use super::{Audit, AuditLoadError, AuditState, audit_meta};
use crate::features::audit_workflow::audit::AuditError;
use crate::features::audit_workflow::config::{Config, UsesPolicy};
use crate::features::audit_workflow::finding::location::Locatable;
use crate::features::audit_workflow::finding::{Confidence, Finding, Persona, Severity};
use crate::features::audit_workflow::models::uses::RepositoryUsesPattern;
use crate::features::audit_workflow::models::workflow::ReusableWorkflowCallJob;
use crate::features::audit_workflow::models::{
    AsDocument, StepCommon, action::CompositeStep, uses::UsesExt as _, workflow::Step,
};

pub(crate) struct UnpinnedUses;

audit_meta!(UnpinnedUses, "unpinned-uses", "unpinned action reference");

impl UnpinnedUses {
    fn evaluate_pinning(uses: &Uses, config: &Config) -> Option<(String, Severity, Persona)> {
        match uses {
            Uses::Local(_) | Uses::Docker(_) => None,
            Uses::Repository(repo_uses) => {
                let (pattern, policy) = config.unpinned_uses_policies.get_policy(repo_uses);

                let pat_desc = match pattern {
                    Some(RepositoryUsesPattern::Any) | None => "blanket".into(),
                    Some(RepositoryUsesPattern::InOwner(owner)) => format!("{owner}/*"),
                    Some(RepositoryUsesPattern::InRepo { owner, repo }) => {
                        format!("{owner}/{repo}/*")
                    }
                    Some(RepositoryUsesPattern::ExactRepo { owner, repo }) => {
                        format!("{owner}/{repo}")
                    }
                    Some(RepositoryUsesPattern::ExactPath {
                        owner,
                        repo,
                        subpath,
                    }) => {
                        format!("{owner}/{repo}/{subpath}")
                    }

                    Some(RepositoryUsesPattern::ExactWithRef { .. }) => unreachable!(),
                };

                match policy {
                    UsesPolicy::Any => None,
                    UsesPolicy::RefPin => uses.unpinned().then_some((
                        format!(
                            "action is not pinned to a ref or hash (required by {pat_desc} policy)"
                        ),
                        Severity::High,
                        Persona::default(),
                    )),
                    UsesPolicy::HashPin => uses.unhashed().then_some((
                        format!("action is not pinned to a hash (required by {pat_desc} policy)"),
                        Severity::High,
                        Persona::default(),
                    )),
                }
            }
        }
    }

    fn process_uses<'a, 'doc, S>(
        uses: &'doc Uses,
        parent: &'a S,
        config: &Config,
    ) -> Result<Option<Finding<'doc>>, AuditError>
    where
        S: Locatable<'doc> + AsDocument<'a, 'doc>,
    {
        let Some((annotation, severity, persona)) = Self::evaluate_pinning(uses, config) else {
            return Ok(None);
        };

        let builder = Self::finding()
            .confidence(Confidence::High)
            .severity(severity)
            .persona(persona)
            .add_location(parent.location().hidden())
            .add_location(
                parent
                    .location()
                    .primary()
                    .with_keys(["uses".into()])
                    .subfeature(Subfeature::new(0, uses.raw()))
                    .annotated(annotation),
            );

        Ok(Some(builder.build(parent)?))
    }

    fn process_step<'doc>(
        step: &impl StepCommon<'doc>,
        config: &Config,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let Some(uses) = step.uses() else {
            return Ok(vec![]);
        };

        Ok(Self::process_uses(uses, step, config)?
            .into_iter()
            .collect())
    }
}

impl Audit for UnpinnedUses {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_step<'doc>(
        &self,
        step: &Step<'doc>,
        group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        if let Some(lock) = group.lock()
            && lock.is_locked(step)
        {
            return Ok(vec![]);
        }

        Self::process_step(step, group.config())
    }

    fn audit_composite_step<'a>(
        &self,
        step: &CompositeStep<'a>,
        group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'a>>, AuditError> {
        Self::process_step(step, group.config())
    }

    fn audit_reusable_job<'doc>(
        &self,
        job: &ReusableWorkflowCallJob<'doc>,
        group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Ok(Self::process_uses(&job.uses, job, group.config())?
            .into_iter()
            .collect())
    }
}

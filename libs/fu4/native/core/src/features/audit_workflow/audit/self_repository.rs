use github_actions_models::common::Uses;
use subfeature::Subfeature;

use crate::features::audit_workflow::{
    audit::{Audit, AuditError, AuditLoadError, audit_meta},
    finding::{Confidence, Finding, Severity, location::Locatable},
    models::{
        AsDocument, StepCommon as _,
        action::CompositeStep,
        workflow::{ReusableWorkflowCallJob, Step},
    },
    state::AuditState,
};

audit_meta!(
    SelfRepository,
    "self-repository",
    "use GitHub's dedicated self-repository syntax"
);

pub(crate) struct SelfRepository;

impl SelfRepository {
    fn audit_common<'a, 'doc, P>(
        parent: &'a P,
        uses: &'doc Uses,
    ) -> Result<Vec<Finding<'doc>>, AuditError>
    where
        P: AsDocument<'a, 'doc> + Locatable<'doc>,
    {
        let mut findings = vec![];

        let Uses::Local(uses) = uses else {
            return Ok(findings);
        };

        if !uses.is_self_repository() {
            findings.push(
                Self::finding()
                    .severity(Severity::Low)
                    .confidence(Confidence::High)
                    .add_location(parent.location_with_grip())
                    .add_location(
                        parent
                            .location()
                            .with_keys(["uses".into()])
                            .subfeature(Subfeature::new(0, uses.raw()))
                            .annotated("use '$/...' instead of './...'")
                            .primary(),
                    )
                    .build(parent)?,
            );
        }

        Ok(findings)
    }
}

impl Audit for SelfRepository {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_reusable_job<'doc>(
        &self,
        job: &ReusableWorkflowCallJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let (parent, uses) = (job, &job.uses);
        Self::audit_common(parent, uses)
    }

    fn audit_step<'doc>(
        &self,
        step: &Step<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let (parent, uses) = match step.uses() {
            Some(uses) => (step, uses),
            None => return Ok(vec![]),
        };

        Self::audit_common(parent, uses)
    }

    fn audit_composite_step<'doc>(
        &self,
        step: &CompositeStep<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let (parent, uses) = match step.uses() {
            Some(uses) => (step, uses),
            None => return Ok(vec![]),
        };

        Self::audit_common(parent, uses)
    }
}

use github_actions_models::common;

use crate::features::audit_workflow::{
    audit::{Audit, AuditError, audit_meta},
    finding::{
        Confidence, Severity,
        location::{Locatable as _, SymbolicLocation},
    },
    models::AsDocument,
    utils,
};

pub(crate) struct UnsoundCondition;

audit_meta!(
    UnsoundCondition,
    "unsound-condition",
    "unsound conditional expression"
);

impl UnsoundCondition {
    fn is_unsound_fenced_expansion(cond: &common::If) -> bool {
        let common::If::Expr(raw_expr) = cond else {
            return false;
        };

        let Some((expr, _)) = utils::extract_fenced_expression(raw_expr, 0) else {
            return false;
        };

        raw_expr.len() > expr.as_raw().len()
    }

    fn process_conditions<'a, 'doc>(
        doc: &'a impl AsDocument<'a, 'doc>,
        conditions: impl Iterator<Item = (&'doc common::If, SymbolicLocation<'doc>)>,
    ) -> Result<Vec<super::Finding<'doc>>, AuditError> {
        let mut findings = vec![];
        for (cond, loc) in conditions {
            if Self::is_unsound_fenced_expansion(cond) {
                let finding_builder = Self::finding()
                    .severity(Severity::High)
                    .confidence(Confidence::High)
                    .add_location(loc.clone().hidden())
                    .add_location(
                        loc.with_keys(["if".into()])
                            .primary()
                            .annotated("condition always evaluates to true"),
                    );

                findings.push(finding_builder.build(doc)?);
            }
        }

        Ok(findings)
    }
}

impl Audit for UnsoundCondition {
    fn new(
        _state: &crate::features::audit_workflow::state::AuditState,
    ) -> Result<Self, super::AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_normal_job<'doc>(
        &self,
        job: &crate::features::audit_workflow::models::workflow::NormalJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<crate::features::audit_workflow::finding::Finding<'doc>>, AuditError> {
        Self::process_conditions(job, job.conditions())
    }

    fn audit_reusable_job<'doc>(
        &self,
        job: &crate::features::audit_workflow::models::workflow::ReusableWorkflowCallJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<crate::features::audit_workflow::finding::Finding<'doc>>, AuditError> {
        let conds = job.r#if.iter().map(|cond| (cond, job.location()));
        Self::process_conditions(job, conds)
    }

    fn audit_action<'doc>(
        &self,
        action: &'doc crate::features::audit_workflow::models::action::Action,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<crate::features::audit_workflow::finding::Finding<'doc>>, AuditError> {
        Self::process_conditions(action, action.conditions())
    }
}

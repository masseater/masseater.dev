use github_actions_models::action;
use github_actions_models::common::Env;
use github_actions_models::common::expr::LoE;
use github_actions_models::workflow::job;

use super::{AuditLoadError, Job, audit_meta};
use crate::features::audit_workflow::audit::{Audit, AuditError};
use crate::features::audit_workflow::finding::location::Locatable as _;
use crate::features::audit_workflow::finding::{
    Confidence, Finding, Persona, Severity, location::SymbolicLocation,
};
use crate::features::audit_workflow::models::workflow::StepInner;
use crate::features::audit_workflow::models::{AsDocument, workflow::Steps, workflow::Workflow};
use crate::features::audit_workflow::state::AuditState;

pub(crate) struct InsecureCommands;

audit_meta!(
    InsecureCommands,
    "insecure-commands",
    "execution of insecure workflow commands is enabled"
);

impl InsecureCommands {
    fn insecure_commands_maybe_present<'a, 'doc>(
        doc: &'a impl AsDocument<'a, 'doc>,
        location: SymbolicLocation<'doc>,
    ) -> Result<Finding<'doc>, AuditError> {
        Self::finding()
            .confidence(Confidence::Low)
            .severity(Severity::High)
            .persona(Persona::Auditor)
            .add_location(
                location.primary().with_keys(["env".into()]).annotated(
                    "non-static environment may contain ACTIONS_ALLOW_UNSECURE_COMMANDS",
                ),
            )
            .build(doc)
    }

    fn insecure_commands_allowed<'s, 'doc>(
        doc: &'s impl AsDocument<'s, 'doc>,
        location: SymbolicLocation<'doc>,
    ) -> Result<Finding<'doc>, AuditError> {
        Self::finding()
            .confidence(Confidence::High)
            .severity(Severity::High)
            .add_location(
                location
                    .primary()
                    .with_keys(["env".into()])
                    .annotated("insecure commands enabled here"),
            )
            .build(doc)
    }

    fn has_insecure_commands_enabled(env: &Env) -> bool {
        match env.get("ACTIONS_ALLOW_UNSECURE_COMMANDS") {
            Some(value) => value.csharp_bool(),
            None => false,
        }
    }

    fn audit_steps<'doc>(
        workflow: &'doc Workflow,
        steps: Steps<'doc>,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        steps
            .into_iter()
            .filter_map(|step| {
                let StepInner::Run(job::RunStep { shared, .. }) = &&*step else {
                    return None;
                };

                match &shared.env {
                    LoE::Expr(_) => Some(Self::insecure_commands_maybe_present(
                        workflow,
                        step.location(),
                    )),
                    LoE::Literal(env) => Self::has_insecure_commands_enabled(env)
                        .then(|| Self::insecure_commands_allowed(workflow, step.location())),
                }
            })
            .collect()
    }
}

impl Audit for InsecureCommands {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_workflow<'doc>(
        &self,
        workflow: &'doc Workflow,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut results = vec![];

        match &workflow.env {
            LoE::Expr(_) => {
                results.push(Self::insecure_commands_maybe_present(
                    workflow,
                    workflow.location(),
                )?);
            }
            LoE::Literal(env) => {
                if Self::has_insecure_commands_enabled(env) {
                    results.push(Self::insecure_commands_allowed(
                        workflow,
                        workflow.location(),
                    )?);
                }
            }
        }

        for job in workflow.jobs() {
            if let Job::NormalJob(normal) = job {
                match &normal.env {
                    LoE::Expr(_) => results.push(Self::insecure_commands_maybe_present(
                        workflow,
                        normal.location(),
                    )?),
                    LoE::Literal(env) => {
                        if Self::has_insecure_commands_enabled(env) {
                            results.push(Self::insecure_commands_allowed(
                                workflow,
                                normal.location(),
                            )?);
                        }
                    }
                }

                results.extend(Self::audit_steps(workflow, normal.steps())?);
            }
        }

        Ok(results)
    }

    fn audit_composite_step<'doc>(
        &self,
        step: &super::CompositeStep<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let action::StepBody::Run { .. } = &step.body else {
            return Ok(findings);
        };

        match &step.env {
            LoE::Expr(_) => {
                findings.push(Self::insecure_commands_maybe_present(
                    step.action(),
                    step.location(),
                )?);
            }
            LoE::Literal(env) => {
                if Self::has_insecure_commands_enabled(env) {
                    findings.push(Self::insecure_commands_allowed(
                        step.action(),
                        step.location(),
                    )?);
                }
            }
        }

        Ok(findings)
    }
}

pub(crate) struct AnonymousDefinition;

use crate::features::audit_workflow::{
    audit::AuditError,
    finding::{Confidence, Persona, Severity, location::Locatable as _},
    state::AuditState,
};

use super::{Audit, AuditLoadError, Job, audit_meta};

const ANONYMOUS_DEFINITION_WORKFLOW_SEVERITY: Severity = Severity::Low;
const ANONYMOUS_DEFINITION_JOB_SEVERITY: Severity = Severity::Informational;

audit_meta!(
    AnonymousDefinition,
    "anonymous-definition",
    "workflow or action definition without a name"
);

impl Audit for AnonymousDefinition {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError> {
        Ok(Self)
    }

    fn audit_workflow<'doc>(
        &self,
        workflow: &'doc crate::features::audit_workflow::models::workflow::Workflow,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<crate::features::audit_workflow::finding::Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        if workflow.name.is_none() {
            findings.push(
                Self::finding()
                    .severity(ANONYMOUS_DEFINITION_WORKFLOW_SEVERITY)
                    .confidence(Confidence::High)
                    .persona(Persona::Pedantic)
                    .add_location(workflow.location().primary())
                    .tip("use 'name: ...' to give this workflow a name")
                    .build(workflow)?,
            );
        }

        for job in workflow.jobs() {
            match job {
                Job::NormalJob(normal) => {
                    if normal.name.is_none() {
                        findings.push(
                            Self::finding()
                                .severity(ANONYMOUS_DEFINITION_JOB_SEVERITY)
                                .confidence(Confidence::High)
                                .persona(Persona::Pedantic)
                                .add_location(normal.location_with_grip().primary())
                                .tip("use 'name: ...' to give this job a name")
                                .build(workflow)?,
                        );
                    }
                }
                Job::ReusableWorkflowCallJob(_) => {}
            }
        }

        Ok(findings)
    }
}

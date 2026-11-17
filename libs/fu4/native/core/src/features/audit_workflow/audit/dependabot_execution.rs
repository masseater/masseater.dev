use github_actions_models::dependabot::v2::AllowDeny;

use crate::features::audit_workflow::{
    audit::{Audit, AuditError, audit_meta},
    finding::location::Locatable as _,
};

audit_meta!(
    DependabotExecution,
    "dependabot-execution",
    "external code execution in Dependabot updates"
);

pub(crate) struct DependabotExecution;

impl DependabotExecution {}

impl Audit for DependabotExecution {
    fn new(
        _state: &crate::features::audit_workflow::state::AuditState,
    ) -> Result<Self, super::AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_dependabot<'doc>(
        &self,
        dependabot: &'doc crate::features::audit_workflow::models::dependabot::Dependabot,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<crate::features::audit_workflow::finding::Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        for update in dependabot.updates() {
            if matches!(update.insecure_external_code_execution, AllowDeny::Allow) {
                findings.push(
                    Self::finding()
                        .confidence(crate::features::audit_workflow::finding::Confidence::High)
                        .severity(crate::features::audit_workflow::finding::Severity::High)
                        .add_location(
                            update
                                .location()
                                .with_keys(["insecure-external-code-execution".into()])
                                .primary()
                                .annotated("enabled here"),
                        )
                        .add_location(update.location_with_grip())
                        .build(dependabot)?,
                );
            }
        }

        Ok(findings)
    }
}

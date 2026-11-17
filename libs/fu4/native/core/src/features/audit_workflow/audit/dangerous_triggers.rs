use std::sync::LazyLock;

use itertools::Itertools as _;

use super::{Audit, AuditLoadError, audit_meta};
use crate::features::audit_workflow::audit::AuditError;
use crate::features::audit_workflow::finding::{Confidence, Finding, Severity};
use crate::features::audit_workflow::models::coordinate::ActionCoordinate;
use crate::features::audit_workflow::models::workflow::{Job, Workflow};
use crate::features::audit_workflow::state::AuditState;

static ACTIONS_LABELER: LazyLock<ActionCoordinate> =
    LazyLock::new(|| ActionCoordinate::NotConfigurable("actions/labeler".parse().unwrap()));

pub(crate) struct DangerousTriggers;

audit_meta!(
    DangerousTriggers,
    "dangerous-triggers",
    "use of fundamentally insecure workflow trigger"
);

impl DangerousTriggers {
    fn is_single_step_workflow(workflow: &Workflow, coord: &ActionCoordinate) -> bool {
        if let Ok(Job::NormalJob(job)) = workflow.jobs().exactly_one()
            && let Ok(step) = job.steps().exactly_one()
            && coord.usage(&step).is_some()
        {
            true
        } else {
            false
        }
    }
}

impl Audit for DangerousTriggers {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError> {
        Ok(Self)
    }

    fn audit_workflow<'doc>(
        &self,
        workflow: &'doc Workflow,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let on_location = workflow.location().with_keys(["on".into()]);

        if let Some(location) = workflow.pull_request_target()
            && !Self::is_single_step_workflow(workflow, &ACTIONS_LABELER)
        {
            findings.push(
                Self::finding()
                    .confidence(Confidence::Medium)
                    .severity(Severity::High)
                    .add_location(on_location.clone().hidden())
                    .add_location(
                        location
                            .primary()
                            .annotated("pull_request_target is almost always used insecurely"),
                    )
                    .build(workflow)?,
            );
        }

        if let Some(location) = workflow.workflow_run() {
            findings.push(
                Self::finding()
                    .confidence(Confidence::Medium)
                    .severity(Severity::High)
                    .add_location(on_location.clone().hidden())
                    .add_location(
                        location
                            .primary()
                            .annotated("workflow_run is almost always used insecurely"),
                    )
                    .build(workflow)?,
            );
        }

        if let Some(location) = workflow.issue_comment() {
            findings.push(
                Self::finding()
                    .confidence(Confidence::Medium)
                    .severity(Severity::High)
                    .add_location(on_location.clone().hidden())
                    .add_location(
                        location
                            .primary()
                            .annotated("issue_comment is almost always used insecurely"),
                    )
                    .build(workflow)?,
            );
        }

        Ok(findings)
    }
}

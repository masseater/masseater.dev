use super::{Audit, AuditLoadError, Job, audit_meta};
use crate::features::audit_workflow::finding::location::Locatable as _;
use crate::features::audit_workflow::{
    audit::AuditError,
    finding::{Confidence, Finding, Persona, Severity},
    models::workflow::Workflow,
    state::AuditState,
};
use github_actions_models::workflow::Concurrency;

pub(crate) struct ConcurrencyLimits;

audit_meta!(
    ConcurrencyLimits,
    "concurrency-limits",
    "insufficient job-level concurrency limits"
);

impl Audit for ConcurrencyLimits {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError> {
        Ok(Self)
    }

    fn audit_workflow<'doc>(
        &self,
        workflow: &'doc Workflow,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        if workflow.is_reusable_only() {
            return Ok(findings);
        }

        match &workflow.concurrency {
            Some(Concurrency::Bare(_)) => {
                findings.push(
                    Self::finding()
                        .confidence(Confidence::High)
                        .severity(Severity::Low)
                        .persona(Persona::Pedantic)
                        .add_location(
                            workflow
                                .location()
                                .primary()
                                .with_keys(["concurrency".into()])
                                .annotated("workflow concurrency is missing cancel-in-progress"),
                        )
                        .build(workflow)?,
                );
            }
            None => {
                let mut jobs_missing_concurrency = vec![];
                let mut jobs_missing_cancel_in_progress = vec![];

                for job in workflow.jobs() {
                    let Job::NormalJob(job) = job else {
                        continue;
                    };
                    match &job.concurrency {
                        Some(Concurrency::Bare(_)) => {
                            jobs_missing_cancel_in_progress.push(job);
                        }
                        None => {
                            jobs_missing_concurrency.push(job);
                        }

                        _ => {}
                    }
                }

                if !jobs_missing_cancel_in_progress.is_empty() {
                    let mut finding_builder = Self::finding()
                        .confidence(Confidence::High)
                        .severity(Severity::Low)
                        .persona(Persona::Pedantic)
                        .add_location(
                            workflow
                                .location()
                                .primary()
                                .with_keys(["on".into()])
                                .annotated("workflow is missing concurrency setting"),
                        );

                    for job in &jobs_missing_cancel_in_progress {
                        finding_builder = finding_builder.add_location(
                            job.location()
                                .with_keys(["concurrency".into()])
                                .annotated("job concurrency is missing cancel-in-progress"),
                        );
                    }

                    findings.push(finding_builder.build(workflow)?);
                }

                if !jobs_missing_concurrency.is_empty() {
                    let mut finding_builder = Self::finding()
                        .confidence(Confidence::High)
                        .severity(Severity::Low)
                        .persona(Persona::Pedantic)
                        .add_location(
                            workflow
                                .location()
                                .primary()
                                .with_keys(["on".into()])
                                .annotated("workflow is missing concurrency setting"),
                        );

                    for job in &jobs_missing_concurrency {
                        finding_builder = finding_builder.add_location(
                            job.location_with_grip()
                                .annotated("job affected by missing workflow concurrency"),
                        );
                    }

                    findings.push(finding_builder.build(workflow)?);
                }
            }

            _ => {}
        }

        Ok(findings)
    }
}

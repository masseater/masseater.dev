use super::{Audit, AuditLoadError, audit_meta};
use crate::features::audit_workflow::finding::Finding;
use crate::features::audit_workflow::finding::location::Locatable as _;
use crate::features::audit_workflow::models::workflow::runners::{Runner, RunnerEvidence};
use crate::features::audit_workflow::models::workflow::{JobCommon as _, NormalJob};
use crate::features::audit_workflow::{
    AuditState,
    audit::AuditError,
    finding::{Confidence, Persona, Severity},
};

pub(crate) struct SelfHostedRunner;

audit_meta!(
    SelfHostedRunner,
    "self-hosted-runner",
    "runs on a self-hosted runner"
);

impl Audit for SelfHostedRunner {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_normal_job<'doc>(
        &self,
        job: &NormalJob<'doc>,
        group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let included_runners = &group.config().self_hosted_runner.deny_runners;
        let excluded_groups = &group.config().self_hosted_runner.allow_groups;

        let self_hosted_runners = job
            .runners(included_runners, excluded_groups)
            .filter(|runner| match runner {
                Runner::SelfHosted { .. } => true,
                Runner::Indeterminate {
                    self_hosted_evidence,
                    ..
                } => *self_hosted_evidence,
                _ => false,
            })
            .collect::<Vec<_>>();

        let mut findings = Vec::new();

        for runner in self_hosted_runners {
            match runner {
                Runner::SelfHosted {
                    location,
                    evidence,
                    from_matrix,
                } => match evidence {
                    RunnerEvidence::ClassicSentinel | RunnerEvidence::ExplicitlyFlagged => {
                        let finding_builder = Self::finding()
                            .confidence(Confidence::High)
                            .severity(Severity::Medium)
                            .persona(Persona::Auditor)
                            .add_location(
                                job.location()
                                    .primary()
                                    .with_keys(["runs-on".into()])
                                    .annotated("self-hosted runner used here"),
                            );

                        if from_matrix {
                            findings.push(
                                finding_builder
                                    .add_location(
                                        location
                                            .with_keys(["strategy".into()])
                                            .annotated("matrix declares self-hosted runner"),
                                    )
                                    .build(job.parent())?,
                            );
                        } else {
                            findings.push(finding_builder.build(job.parent())?);
                        }
                    }
                    RunnerEvidence::RunnerGroup => findings.push(
                        Self::finding()
                            .confidence(Confidence::High)
                            .severity(Severity::Medium)
                            .persona(Persona::Auditor)
                            .add_location(
                                job.location()
                                    .primary()
                                    .with_keys(["runs-on".into()])
                                    .annotated("runner group used here"),
                            )
                            .build(job.parent())?,
                    ),
                },
                Runner::Indeterminate {
                    location,
                    from_matrix,
                    ..
                } => {
                    let finding_builder = Self::finding()
                        .confidence(Confidence::Low)
                        .severity(Severity::Medium)
                        .persona(Persona::Auditor)
                        .add_location(
                            job.location()
                                .primary()
                                .with_keys(["runs-on".into()])
                                .annotated("expression may expand into a self-hosted runner"),
                        );

                    if from_matrix {
                        findings.push(
                            finding_builder
                                .add_location(
                                    location
                                        .with_keys(["strategy".into()])
                                        .annotated("matrix may use self-hosted runners"),
                                )
                                .build(job.parent())?,
                        );
                    } else {
                        findings.push(finding_builder.build(job.parent())?);
                    }
                }
                _ => {}
            }
        }

        Ok(findings)
    }
}

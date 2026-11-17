use github_actions_models::common::{Uses, expr::LoE};
use subfeature::Subfeature;

use crate::features::audit_workflow::{
    audit::{Audit, AuditError, AuditLoadError, audit_meta},
    finding::{Confidence, Finding, Persona, Severity},
    models::{
        StepBodyCommon, StepCommon, action::CompositeStep, uses::RepositoryUsesExt as _,
        workflow::Step,
    },
    state::AuditState,
    utils,
};

audit_meta!(
    Misfeature,
    "misfeature",
    "usage of GitHub Actions misfeatures"
);

pub(crate) struct Misfeature;

impl Misfeature {
    fn process_step<'doc>(step: &impl StepCommon<'doc>) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let Some(step_body) = step.body() else {
            return Ok(findings);
        };

        match step_body {
            StepBodyCommon::Uses {
                uses: Uses::Repository(uses),
                with: LoE::Literal(with),
            } => {
                if uses.matches("actions/setup-python") && with.contains_key("pip-install") {
                    findings.push(
                        Self::finding()
                            .add_location(
                                step.location()
                                    .with_keys(["uses".into()])
                                    .subfeature(Subfeature::new(0, uses.raw()))
                                    .annotated("this action"),
                            )
                            .add_location(
                                step.location()
                                    .primary()
                                    .with_keys(["with".into(), "pip-install".into()])
                                    .annotated("installs packages in a brittle manner"),
                            )
                            .tip("always use a virtual environment to manage Python packages")
                            .severity(Severity::Low)
                            .confidence(Confidence::High)
                            .build(step)?,
                    );
                }
            }
            StepBodyCommon::Run { .. } => {
                match step
                    .shell()
                    .map(|(shell, loc)| (utils::normalize_shell(shell), loc))
                {
                    Some(("bash" | "pwsh" | "python" | "sh" | "powershell", _)) => {}

                    Some(("cmd" | "cmd.exe", shell_loc)) => {
                        findings.push(
                            Self::finding()
                                .confidence(Confidence::High)
                                .severity(Severity::Low)
                                .add_location(
                                    step.location_with_grip()
                                        .annotated("Windows CMD shell limits analysis"),
                                )
                                .add_location(shell_loc.primary())
                                .tip("use 'shell: pwsh' or 'shell: bash' for improved analysis")
                                .build(step)?,
                        );
                    }

                    Some((_, shell_loc)) => {
                        findings.push(
                            Self::finding()
                                .confidence(Confidence::High)
                                .severity(Severity::Low)
                                .persona(Persona::Auditor)
                                .add_location(
                                    step.location().with_keys(["run".into()]).key_only().annotated("uses a non-well-known shell")
                                )
                                .add_location(shell_loc.primary())
                                .tip("use a shell that's well-known to GitHub Actions, like 'bash' or 'pwsh'")
                                .build(step)?,
                        );
                    }
                    _ => {}
                }
            }

            StepBodyCommon::Uses { .. } => {}
        }

        Ok(findings)
    }
}

impl Audit for Misfeature {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_step<'doc>(
        &self,
        step: &Step<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Self::process_step(step)
    }

    fn audit_composite_step<'a>(
        &self,
        step: &CompositeStep<'a>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'a>>, AuditError> {
        Self::process_step(step)
    }
}

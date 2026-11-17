use github_actions_expressions::Expr;
use subfeature::Subfeature;

use crate::features::audit_workflow::{
    audit::{Audit, AuditError, AuditLoadError, audit_meta},
    finding::{
        Confidence, Finding, Persona, Severity,
        location::{Feature, Locatable as _, Location},
    },
    models::workflow::{JobCommon as _, NormalJob},
    state::AuditState,
    utils::{once::warn_once, parse_fenced_expressions_from_routable},
};

pub(crate) struct SecretsOutsideEnvironment;

audit_meta!(
    SecretsOutsideEnvironment,
    "secrets-outside-env",
    "secrets referenced without a dedicated environment"
);

impl Audit for SecretsOutsideEnvironment {
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
        if job.parent().workflow_call().is_some() {
            return Ok(vec![]);
        }

        if job.environment.is_some() {
            return Ok(vec![]);
        }

        let mut findings = vec![];
        for (expr, span) in parse_fenced_expressions_from_routable(job) {
            let Ok(parsed) = Expr::parse(expr.as_bare()) else {
                warn_once!("couldn't parse expression: {expr}", expr = expr.as_bare());
                continue;
            };

            for (context, origin) in parsed.contexts() {
                if !context.child_of("secrets") {
                    continue;
                }

                if let Some(secret_name) = context.single_tail()
                    && group
                        .config()
                        .secrets_outside_env_policy
                        .allow
                        .contains(&secret_name.to_ascii_lowercase())
                {
                    continue;
                }

                let after = span.start + origin.span.start;
                let subfeature = Subfeature::new(after, origin.raw);

                findings.push(
                    Self::finding()
                        .persona(Persona::Auditor)
                        .severity(Severity::Medium)
                        .confidence(Confidence::High)
                        .add_location(job.location().hidden())
                        .add_location(job.location().key_only())
                        .add_raw_location(Location::new(
                            job.location()
                                .primary()
                                .annotated("secret is accessed outside of a dedicated environment"),
                            Feature::from_subfeature(&subfeature, job),
                        ))
                        .build(job)?,
                );
            }
        }

        Ok(findings)
    }
}

use std::{collections::HashMap, sync::LazyLock, vec};

use github_actions_expressions::{Expr, context::Context};
use github_actions_models::common::{EnvValue, RepositoryUses, Uses, expr::LoE};

use super::{Audit, AuditLoadError, audit_meta};
use crate::features::audit_workflow::{
    audit::AuditError,
    finding::{Confidence, Finding, Persona, Severity, location::SymbolicLocation},
    models::{
        self, StepCommon, action::CompositeStep, inputs::Capability, uses::RepositoryUsesPattern,
        workflow::Step,
    },
    state::AuditState,
    utils::extract_fenced_expressions,
};
use subfeature::Subfeature;

pub(crate) struct TemplateInjection;

audit_meta!(
    TemplateInjection,
    "template-injection",
    "code injection via template expansion"
);

static ACTION_INJECTION_SINKS: LazyLock<Vec<(RepositoryUsesPattern, Vec<&str>)>> =
    LazyLock::new(|| {
        let mut sinks: Vec<(RepositoryUsesPattern, Vec<&str>)> =
            serde_json::from_slice(include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/data/zizmor/codeql-injection-sinks.json"
            )))
            .unwrap();

        sinks.extend([
            ("amadevus/pwsh-script".parse().unwrap(), vec!["script"]),
            (
                "jannekem/run-python-script-action".parse().unwrap(),
                vec!["script"],
            ),
            (
                "cardinalby/js-eval-action".parse().unwrap(),
                vec!["expression"],
            ),
            (
                "addnab/docker-run-action".parse().unwrap(),
                vec!["options", "run"],
            ),
        ]);
        sinks
    });

static CONTEXT_CAPABILITIES: LazyLock<HashMap<&str, Capability>> = LazyLock::new(|| {
    include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/data/zizmor/context-capabilities.csv"
    ))
    .lines()
    .filter_map(|line| line.split_once(','))
    .map(|(context, capability)| {
        let capability = match capability {
            "arbitrary" => Capability::Arbitrary,
            "structured" => Capability::Structured,
            "fixed" => Capability::Fixed,
            _ => unreachable!("unexpected context capability"),
        };
        (context, capability)
    })
    .collect()
});

impl Capability {
    fn from_context(context: &str) -> Option<Self> {
        CONTEXT_CAPABILITIES.get(context).copied()
    }
}

impl TemplateInjection {
    fn action_injection_sinks(uses: &RepositoryUses) -> &[&'static str] {
        ACTION_INJECTION_SINKS
            .iter()
            .find(|(pattern, _)| pattern.matches(&uses.into()))
            .map_or(&[], |(_, sinks)| sinks.as_slice())
    }

    fn scripts_with_location<'doc>(
        step: &impl StepCommon<'doc>,
    ) -> Vec<(
        &'doc str,
        SymbolicLocation<'doc>,
        Vec<SymbolicLocation<'doc>>,
    )> {
        match step.body() {
            Some(models::StepBodyCommon::Uses {
                uses: Uses::Repository(uses),
                with: LoE::Literal(with),
            }) => Self::action_injection_sinks(uses)
                .iter()
                .filter_map(|input| {
                    let input = *input;
                    with.get(input)
                        .and_then(|script| {
                            if let EnvValue::String(script) = script {
                                Some(script.as_str())
                            } else {
                                None
                            }
                        })
                        .map(|script| {
                            (
                                script,
                                step.location().with_keys(["with".into(), input.into()]),
                                vec![
                                    step.location()
                                        .with_keys(["uses".into()])
                                        .annotated("action accepts arbitrary code"),
                                    step.location()
                                        .with_keys(["with".into(), input.into()])
                                        .annotated("via this input")
                                        .key_only(),
                                ],
                            )
                        })
                })
                .collect(),
            Some(models::StepBodyCommon::Run { run, .. }) => {
                vec![(
                    run,
                    step.location().with_keys(["run".into()]),
                    vec![
                        step.location()
                            .with_keys(["run".into()])
                            .annotated("this run block")
                            .key_only(),
                    ],
                )]
            }
            _ => vec![],
        }
    }

    fn classify<'doc>(
        context: &Context<'_>,
        step: &impl StepCommon<'doc>,
    ) -> Option<(Severity, Confidence, Persona)> {
        let Some(context_pattern) = context.as_pattern() else {
            return Some((Severity::Informational, Confidence::Low, Persona::default()));
        };
        match Capability::from_context(&context_pattern) {
            Some(Capability::Fixed) => None,
            Some(Capability::Structured) => {
                Some((Severity::Medium, Confidence::High, Persona::default()))
            }
            Some(Capability::Arbitrary) => {
                Some((Severity::High, Confidence::High, Persona::default()))
            }
            None if context.child_of("secrets")
                || context.matches("needs.*.result")
                || context.matches("steps.*.outcome")
                || context.matches("steps.*.conclusion") =>
            {
                None
            }
            None if context.child_of("inputs") => Some(
                match context
                    .single_tail()
                    .and_then(|input_name| step.get_input(input_name))
                {
                    Some(Capability::Fixed) => (Severity::Low, Confidence::High, Persona::Pedantic),
                    Some(Capability::Structured) => {
                        (Severity::Medium, Confidence::High, Persona::default())
                    }
                    Some(Capability::Arbitrary) => {
                        (Severity::High, Confidence::High, Persona::default())
                    }
                    None => (Severity::Low, Confidence::Low, Persona::default()),
                },
            ),
            None if context.child_of("env") => Some(if step.env_is_static(context) {
                (Severity::Low, Confidence::High, Persona::Pedantic)
            } else {
                (Severity::Low, Confidence::High, Persona::default())
            }),
            None if context.child_of("github") => {
                Some((Severity::High, Confidence::High, Persona::default()))
            }
            None if context.child_of("matrix") => {
                let matrix = step.matrix()?;
                (!matrix.expands_to_static_values(context)).then_some((
                    Severity::Medium,
                    Confidence::Medium,
                    Persona::default(),
                ))
            }
            None => Some((Severity::Informational, Confidence::Low, Persona::default())),
        }
    }

    fn injectable_template_expressions<'doc>(
        script: &'doc str,
        step: &impl StepCommon<'doc>,
    ) -> Vec<(Subfeature<'doc>, Severity, Confidence, Persona)> {
        let mut all_bad_expressions = vec![];
        for (expr, expr_span) in extract_fenced_expressions(script) {
            let Ok(parsed) = Expr::parse(expr.as_bare()) else {
                tracing::warn!("couldn't parse expression: {expr}", expr = expr.as_raw());
                continue;
            };
            let mut bad_expressions = vec![];

            for (context, origin) in parsed.dataflow_contexts() {
                if let Some((severity, confidence, persona)) = Self::classify(context, step) {
                    bad_expressions.push((
                        Subfeature::new(expr_span.start + origin.span.start, origin.raw),
                        severity,
                        confidence,
                        persona,
                    ));
                }
            }

            if bad_expressions.is_empty() {
                bad_expressions.push((
                    Subfeature::new(expr_span.start, &parsed),
                    Severity::Low,
                    Confidence::High,
                    Persona::Pedantic,
                ));
            }

            all_bad_expressions.extend(bad_expressions);
        }

        all_bad_expressions
    }

    fn process_step<'doc>(step: &impl StepCommon<'doc>) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        for (script, script_loc, related_locs) in Self::scripts_with_location(step) {
            for (subfeature, severity, confidence, persona) in
                Self::injectable_template_expressions(script, step)
            {
                let mut finding_builder = Self::finding()
                    .severity(severity)
                    .confidence(confidence)
                    .persona(persona)
                    .add_location(step.location().hidden())
                    .add_location(
                        script_loc
                            .clone()
                            .primary()
                            .subfeature(subfeature)
                            .annotated("may expand into attacker-controllable code".to_string()),
                    );

                for related_loc in &related_locs {
                    finding_builder = finding_builder.add_location(related_loc.clone());
                }

                let finding = finding_builder.build(step)?;
                findings.push(finding);
            }
        }

        Ok(findings)
    }
}

impl Audit for TemplateInjection {
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

#[cfg(test)]
mod tests {
    use crate::features::audit_workflow::audit::template_injection::Capability;

    #[test]
    fn test_capability_from_context() {
        assert!(matches!(
            Capability::from_context("github.event.workflow_run.triggering_actor.login"),
            Some(Capability::Arbitrary)
        ));
        assert!(matches!(
            Capability::from_context("github.event.answer.user.gists_url"),
            Some(Capability::Structured)
        ));
        assert!(matches!(
            Capability::from_context("github.event.type.is_enabled"),
            Some(Capability::Fixed)
        ));
        assert!(matches!(
            Capability::from_context("runner.arch"),
            Some(Capability::Fixed)
        ));
    }
}

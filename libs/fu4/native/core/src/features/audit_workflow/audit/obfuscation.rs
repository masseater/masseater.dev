use github_actions_expressions::{Evaluation, Expr, Origin, SpannedExpr};
use github_actions_models::common::{RepositoryUses, Uses, expr::LoE};

use crate::features::audit_workflow::{
    Confidence, Severity,
    audit::AuditError,
    finding::{
        Finding, Persona,
        location::{Feature, Location},
    },
    models::{StepCommon, action::CompositeStep, workflow::Step},
    utils::parse_fenced_expressions_from_routable,
};
use subfeature::Subfeature;

use super::{Audit, AuditInput, AuditLoadError, AuditState, audit_meta};

pub(crate) struct Obfuscation;

audit_meta!(
    Obfuscation,
    "obfuscation",
    "obfuscated usage of GitHub Actions features"
);

impl Obfuscation {
    fn obfuscated_repo_uses(uses: &RepositoryUses) -> Vec<&'static str> {
        let mut annotations = vec![];

        if let Some(subpath) = uses.subpath() {
            for component in subpath.split('/') {
                match component {
                    "." => {
                        annotations.push("actions reference contains '.'");
                    }
                    ".." => {
                        annotations.push("actions reference contains '..'");
                    }

                    _ if component.is_empty() => {
                        annotations.push("actions reference contains empty component");
                    }
                    _ => {}
                }
            }
        }

        annotations
    }

    fn expression_replacement(evaluation: &Evaluation, is_subexpr: bool) -> Option<String> {
        match (evaluation, is_subexpr) {
            (Evaluation::Array(_) | Evaluation::Object(_), _) => None,

            (Evaluation::String(value), _) if value.contains("${{") => None,

            (Evaluation::String(value), true) => Some(format!("'{}'", value.replace('\'', "''"))),
            (Evaluation::Null, true) => Some("null".into()),
            (Evaluation::Number(value), true) if value.is_finite() => Some(value.to_string()),
            _ => Some(evaluation.sema().to_string()),
        }
    }

    fn obfuscated_exprs<'doc>(
        expr: &SpannedExpr<'doc>,
    ) -> Vec<(&'static str, Origin<'doc>, Persona)> {
        let mut annotations = vec![];

        if expr
            .consteval()
            .and_then(|evaluation| Self::expression_replacement(&evaluation, false))
            .is_some()
        {
            annotations.push((
                "can be replaced by its static evaluation",
                expr.origin,
                Persona::Regular,
            ));
        } else {
            for (subexpr, evaluation) in expr.consteval_subexprs() {
                if Self::expression_replacement(&evaluation, true).is_none() {
                    continue;
                }
                annotations.push((
                    "can be reduced to a constant",
                    subexpr.origin,
                    Persona::Regular,
                ));
            }
        }

        for index_expr in expr.computed_indices() {
            annotations.push((
                "index expression is computed",
                index_expr.origin,
                Persona::Pedantic,
            ));
        }

        annotations
    }

    fn process_step<'doc>(step: &impl StepCommon<'doc>) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        if let Some(crate::features::audit_workflow::models::StepBodyCommon::Uses {
            uses: Uses::Repository(uses),
            with,
        }) = step.body()
        {
            let obfuscated_annotations = Self::obfuscated_repo_uses(uses);
            if !obfuscated_annotations.is_empty() {
                let mut finding_builder = Self::finding()
                    .confidence(Confidence::High)
                    .severity(Severity::Low);

                for annotation in &obfuscated_annotations {
                    finding_builder = finding_builder.add_location(
                        step.location()
                            .primary()
                            .with_keys(["uses".into()])
                            .annotated(*annotation),
                    );
                }

                findings.push(finding_builder.build(step).map_err(Self::err)?);
            }

            if let LoE::Expr(_) = with {
                findings.push(
                    Self::finding()
                        .confidence(Confidence::High)
                        .severity(Severity::Informational)
                        .persona(Persona::Regular)
                        .add_location(
                            step.location()
                                .with_keys(["uses".into()])
                                .annotated("this action"),
                        )
                        .add_location(
                            step.location()
                                .primary()
                                .with_keys(["with".into()])
                                .annotated("use of an expression for `with:` prevents analysis"),
                        )
                        .build(step)
                        .map_err(Self::err)?,
                );
            }
        }

        Ok(findings)
    }
}

impl Audit for Obfuscation {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_raw<'doc>(
        &self,
        input: &'doc AuditInput,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        if !input.supports_gha_template_syntax() {
            return Ok(findings);
        }

        for (expr, expr_span) in parse_fenced_expressions_from_routable(input) {
            let Ok(parsed) = Expr::parse(expr.as_bare()) else {
                tracing::warn!("couldn't parse expression: {expr}", expr = expr.as_bare());
                continue;
            };

            let obfuscated_annotations = Self::obfuscated_exprs(&parsed);

            if !obfuscated_annotations.is_empty() {
                let mut finding_builder = Self::finding()
                    .confidence(Confidence::High)
                    .severity(Severity::Low);

                for (annotation, origin, persona) in &obfuscated_annotations {
                    let after = expr_span.start + origin.span.start;
                    let subfeature = Subfeature::new(after, origin.raw);

                    finding_builder =
                        finding_builder
                            .persona(*persona)
                            .add_raw_location(Location::new(
                                input.location().annotated(*annotation).primary(),
                                Feature::from_subfeature(&subfeature, input),
                            ));
                }
                findings.push(finding_builder.build(input).map_err(Self::err)?);
            }
        }

        Ok(findings)
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

use std::{ops::Deref as _, sync::LazyLock};

use github_actions_expressions::{
    Expr, SpannedExpr,
    call::Call,
    context::{Context, ContextPattern},
    op::{BinExpr, BinOp, UnOp},
};
use github_actions_models::common::If;

use super::{Audit, AuditLoadError, AuditState, audit_meta};
use crate::features::audit_workflow::{
    audit::AuditError,
    finding::{
        Confidence, Severity,
        location::{Locatable as _, SymbolicLocation},
    },
    models::workflow::{JobCommon as _, Workflow},
    utils::{self, ExtractedExpr},
};
use subfeature::Subfeature;

pub(crate) struct BotConditions;

audit_meta!(BotConditions, "bot-conditions", "spoofable bot actor check");

static SPOOFABLE_ACTOR_NAME_CONTEXTS: LazyLock<Vec<ContextPattern>> = LazyLock::new(|| {
    vec![
        ContextPattern::try_new("github.actor").unwrap(),
        ContextPattern::try_new("github.triggering_actor").unwrap(),
    ]
});

static SPOOFABLE_ACTOR_ID_CONTEXTS: LazyLock<Vec<ContextPattern>> =
    LazyLock::new(|| vec![ContextPattern::try_new("github.actor_id").unwrap()]);

const BOT_ACTOR_IDS: &[&str] = &["29110", "49699333", "27856297", "29139614"];

impl Audit for BotConditions {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_normal_job<'doc>(
        &self,
        job: &super::NormalJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<super::Finding<'doc>>, AuditError> {
        let mut conds = vec![];

        if let Some(If::Expr(expr)) = &job.r#if {
            conds.push((
                expr,
                job.location_with_grip(),
                job.location().with_keys(["if".into()]),
            ));
        }

        for step in job.steps() {
            if let Some(If::Expr(expr)) = &step.r#if() {
                conds.push((
                    expr,
                    step.location_with_grip(),
                    step.location().with_keys(["if".into()]),
                ));
            }
        }

        Self::process_conditions(job.parent(), conds)
    }

    fn audit_reusable_job<'doc>(
        &self,
        job: &super::ReusableWorkflowCallJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<super::Finding<'doc>>, AuditError> {
        let conds = match &job.r#if {
            Some(If::Expr(expr)) => vec![(
                expr,
                job.location_with_grip(),
                job.location().with_keys(["if".into()]),
            )],
            _ => vec![],
        };

        Self::process_conditions(job.parent(), conds)
    }
}

impl BotConditions {
    fn process_conditions<'doc>(
        workflow: &'doc Workflow,
        conds: Vec<(&'doc String, SymbolicLocation<'doc>, SymbolicLocation<'doc>)>,
    ) -> Result<Vec<super::Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        for (expr, parent, if_loc) in conds {
            let bare = match utils::extract_fenced_expression(expr, 0) {
                Some((expr, _)) => expr.as_bare(),
                None => ExtractedExpr::new(expr).as_bare(),
            };

            let Ok(expr) = Expr::parse(bare) else {
                tracing::warn!("couldn't parse expression: {expr}");
                continue;
            };

            if let Some((subfeature, _, confidence)) = Self::bot_condition(&expr) {
                let finding_builder = Self::finding()
                    .severity(Severity::High)
                    .confidence(confidence)
                    .add_location(parent.clone())
                    .add_location(
                        if_loc
                            .primary()
                            .subfeature(subfeature)
                            .annotated("actor context may be spoofable"),
                    );

                findings.push(finding_builder.build(workflow)?);
            }
        }

        Ok(findings)
    }

    fn walk_tree_for_bot_condition<'a, 'src>(
        expr: &'a SpannedExpr<'src>,
        dominating: bool,
    ) -> (Option<(&'a SpannedExpr<'src>, &'a SpannedExpr<'src>)>, bool) {
        match &**expr {
            Expr::Call(Call {
                func: _,
                args: exprs,
            })
            | Expr::Context(Context { parts: exprs }) => exprs
                .iter()
                .map(|arg| Self::walk_tree_for_bot_condition(arg, false))
                .reduce(|(bc, _), (bc_next, _)| (bc.or(bc_next), false))
                .unwrap_or((None, dominating)),
            Expr::Index(expr) => Self::walk_tree_for_bot_condition(expr, dominating),
            Expr::BinExpr(BinExpr { lhs, op, rhs }) => match op {
                BinOp::Or => {
                    let (bc_lhs, _) = Self::walk_tree_for_bot_condition(lhs, true);
                    let (bc_rhs, _) = Self::walk_tree_for_bot_condition(rhs, true);

                    (bc_lhs.or(bc_rhs), true)
                }

                BinOp::Eq => {
                    let context_expr = match (lhs.as_ref().deref(), rhs.as_ref().deref()) {
                        (Expr::Context(_), _) => lhs.as_ref(),
                        (_, Expr::Context(_)) => rhs.as_ref(),
                        _ => return (None, true),
                    };

                    match (lhs.as_ref().deref(), rhs.as_ref().deref()) {
                        (Expr::Context(ctx), Expr::Literal(lit))
                        | (Expr::Literal(lit), Expr::Context(ctx)) => {
                            if (SPOOFABLE_ACTOR_NAME_CONTEXTS.iter().any(|x| x.matches(ctx))
                                && lit.as_str().ends_with("[bot]"))
                                || (SPOOFABLE_ACTOR_ID_CONTEXTS.iter().any(|x| x.matches(ctx))
                                    && BOT_ACTOR_IDS.contains(&lit.as_str().as_ref()))
                            {
                                ((Some((expr, context_expr))), true)
                            } else {
                                (None, true)
                            }
                        }
                        (_, _) => {
                            let (bc_lhs, _) = Self::walk_tree_for_bot_condition(lhs, true);
                            let (bc_rhs, _) = Self::walk_tree_for_bot_condition(rhs, true);

                            (bc_lhs.or(bc_rhs), true)
                        }
                    }
                }

                _ => {
                    let (bc_lhs, _) = Self::walk_tree_for_bot_condition(lhs, false);
                    let (bc_rhs, _) = Self::walk_tree_for_bot_condition(rhs, false);

                    (bc_lhs.or(bc_rhs), false)
                }
            },
            Expr::UnExpr { op, expr } => match op {
                UnOp::Not => Self::walk_tree_for_bot_condition(expr, false),
            },
            _ => (None, dominating),
        }
    }

    fn bot_condition<'a, 'doc>(
        expr: &'a SpannedExpr<'doc>,
    ) -> Option<(Subfeature<'doc>, &'a SpannedExpr<'doc>, Confidence)> {
        match Self::walk_tree_for_bot_condition(expr, true) {
            (Some((expr, context_expr)), true) => {
                Some((Subfeature::new(0, expr), context_expr, Confidence::High))
            }

            (Some((expr, context_expr)), false) => {
                Some((Subfeature::new(0, expr), context_expr, Confidence::Medium))
            }

            (..) => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bot_condition() {
        for (cond, context, confidence) in &[
            (
                "github.actor == 'dependabot[bot]'",
                "github.actor",
                Confidence::High,
            ),
            (
                "'dependabot[bot]' == github.actor",
                "github.actor",
                Confidence::High,
            ),
            (
                "'dependabot[bot]' == GitHub.actor",
                "GitHub.actor",
                Confidence::High,
            ),
            (
                "'dependabot[bot]' == GitHub.ACTOR",
                "GitHub.ACTOR",
                Confidence::High,
            ),
            (
                "'dependabot[bot]' == GitHub.triggering_actor",
                "GitHub.triggering_actor",
                Confidence::High,
            ),
            (
                "'dependabot[bot]' == github.actor || true",
                "github.actor",
                Confidence::High,
            ),
            (
                "'dependabot[bot]' == github.actor || false",
                "github.actor",
                Confidence::High,
            ),
            (
                "'dependabot[bot]' == github.actor || github.actor == 'foobar'",
                "github.actor",
                Confidence::High,
            ),
            (
                "github.actor == 'foobar' || 'dependabot[bot]' == github.actor",
                "github.actor",
                Confidence::High,
            ),
            (
                "'dependabot[bot]' == github.actor && something.else",
                "github.actor",
                Confidence::Medium,
            ),
            (
                "something.else && 'dependabot[bot]' == github.actor",
                "github.actor",
                Confidence::Medium,
            ),
        ] {
            let cond = Expr::parse(cond).unwrap();
            let (_, found_context, found_confidence) = BotConditions::bot_condition(&cond).unwrap();
            assert_eq!(found_context.origin.raw, *context);
            assert_eq!(found_confidence, *confidence);
        }
    }
}

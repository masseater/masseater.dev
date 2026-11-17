use github_actions_expressions::{Evaluation, Expr, context};
use github_actions_models::common;
use github_actions_models::common::Env;
use github_actions_models::common::expr::LoE;

use crate::features::audit_workflow::finding::location::{Locatable, SymbolicLocation};
use crate::features::audit_workflow::models::inputs::HasInputs;
use crate::features::audit_workflow::models::workflow::matrix::Matrix;
use crate::features::audit_workflow::registry::input::CollectionError;
use crate::features::audit_workflow::utils::ExtractedExpr;

pub(crate) fn if_is_statically_false(cond: &common::If) -> bool {
    match cond {
        common::If::Bool(b) => !*b,
        common::If::Expr(raw) => {
            let bare = ExtractedExpr::new(raw).as_bare();
            let Ok(expr) = Expr::parse(bare) else {
                return false;
            };
            matches!(expr.consteval(), Some(Evaluation::Boolean(false)))
        }
    }
}

pub(crate) mod action;
pub(crate) mod coordinate;
pub(crate) mod dependabot;
pub(crate) mod inputs;
pub(crate) mod lock;
pub(crate) mod pre_commit;
pub(crate) mod repo_ref;
pub(crate) mod uses;
pub(crate) mod version;
pub(crate) mod workflow;

pub(crate) trait Validatable<'de> {
    type Target: serde::Deserialize<'de>;
    type Skeleton: serde::Deserialize<'de> + serde::Serialize;

    fn validate(contents: &'de str) -> Result<Self::Target, CollectionError> {
        match yaml_serde::from_str::<Self::Target>(contents) {
            Ok(value) => Ok(value),
            Err(e) => match yaml_serde::from_str::<Self::Skeleton>(contents) {
                Ok(_) => Err(e.into()),
                Err(e) => Err(CollectionError::Syntax(e.into())),
            },
        }
    }
}

pub(crate) trait AsDocument<'a, 'doc> {
    fn as_document(&'a self) -> &'doc yamlpath::Document;
}

impl<'a> AsDocument<'a, 'a> for yamlpath::Document {
    fn as_document(&'a self) -> &'a yamlpath::Document {
        self
    }
}

pub(crate) enum StepBodyCommon<'s> {
    Uses {
        uses: &'s common::Uses,
        with: &'s LoE<Env>,
    },
    Run {
        run: &'s str,
        _working_directory: Option<&'s str>,
        _shell: Option<&'s LoE<String>>,
    },
}

pub(crate) trait StepCommon<'doc>: Locatable<'doc> + HasInputs {
    fn ord(&self) -> impl Ord;

    fn env_is_static(&self, ctx: &context::Context) -> bool;

    fn uses(&self) -> Option<&'doc common::Uses>;

    fn matrix(&self) -> Option<Matrix<'doc>>;

    fn body(&self) -> Option<StepBodyCommon<'doc>>;

    fn document(&self) -> &'doc yamlpath::Document;

    fn shell(&self) -> Option<(&str, SymbolicLocation<'doc>)>;
}

impl<'a, 'doc, T: StepCommon<'doc>> AsDocument<'a, 'doc> for T {
    fn as_document(&'a self) -> &'doc yamlpath::Document {
        self.document()
    }
}

#[cfg(test)]
mod tests {
    use super::if_is_statically_false;
    use github_actions_models::common;

    #[test]
    fn test_if_is_statically_false() {
        assert!(if_is_statically_false(&common::If::Bool(false)));
        assert!(!if_is_statically_false(&common::If::Bool(true)));

        for raw in &[
            "${{ false }}",
            "${{false}}",
            "false",
            "${{ true && false }}",
            "${{ !true }}",
            "${{ false || false }}",
        ] {
            assert!(
                if_is_statically_false(&common::If::Expr((*raw).into())),
                "expected statically false: {raw}"
            );
        }

        for raw in &[
            "${{ true }}",
            "true",
            "${{ github.actor == 'foo' }}",
            "${{ inputs.something }}",
            "${{ '' }}",
            "${{ null }}",
            "${{ this is not valid",
        ] {
            assert!(
                !if_is_statically_false(&common::If::Expr((*raw).into())),
                "expected not statically false: {raw}"
            );
        }
    }
}

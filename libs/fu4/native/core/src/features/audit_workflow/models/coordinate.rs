use std::ops::{BitAnd, BitOr, Not};

use github_actions_models::common::{EnvValue, RepositoryUses, Uses, expr::LoE};
use indexmap::{IndexMap, IndexSet, indexset};

use crate::features::audit_workflow::{
    finding::location::Comment,
    models::{uses::RepositoryUsesExt as _, version::Version},
    utils::ExtractedExpr,
};

use super::{StepBodyCommon, StepCommon, uses::RepositoryUsesPattern};

pub(crate) enum ActionCoordinate {
    Configurable {
        uses_pattern: RepositoryUsesPattern,

        control: ControlExpr<'static>,
    },
    NotConfigurable(RepositoryUsesPattern),
}

impl ActionCoordinate {
    pub(crate) fn uses_pattern(&self) -> &RepositoryUsesPattern {
        match self {
            Self::Configurable { uses_pattern, .. } => uses_pattern,
            Self::NotConfigurable(inner) => inner,
        }
    }

    pub(crate) fn usage<'doc>(&self, step: &impl StepCommon<'doc>) -> Option<Usage> {
        let uses_pattern = self.uses_pattern();

        let Some(StepBodyCommon::Uses {
            uses: Uses::Repository(uses),
            with,
        }) = step.body()
        else {
            return None;
        };

        if !uses_pattern.matches(&uses.into()) {
            return None;
        }

        let step_location = step.location();
        let uses_location = step_location
            .with_keys(["uses".into()])
            .concretize(step.document())
            .ok()?;

        match self {
            Self::Configurable {
                uses_pattern: _,
                control,
            } => {
                let LoE::Literal(with) = with else {
                    return Some(Usage::Conditional(indexset! {
                        ControlOrigin::WithExpression
                    }));
                };
                match control.eval(uses, &uses_location.concrete.comments, with) {
                    ControlEvaluation::Satisfied(origins) => Some(Usage::Enabled(origins)),
                    ControlEvaluation::NotSatisfied(_) => None,
                    ControlEvaluation::Conditional(origins) => Some(Usage::Conditional(origins)),
                }
            }

            Self::NotConfigurable(_) => Some(Usage::Always),
        }
    }
}

#[derive(Copy, Clone)]
pub(crate) enum Toggle {
    OptIn,

    OptOut,
}

#[derive(PartialEq)]
pub(crate) enum ControlFieldType {
    Boolean,

    FreeString,

    Exact(&'static [&'static str]),
}

#[derive(Copy, Clone, Debug, Eq, Hash, PartialEq)]
pub(crate) enum ControlOrigin {
    Default { field: &'static str },

    Input { field: &'static str },

    UsesRef,

    WithExpression,
}

#[derive(Clone, Debug, PartialEq)]
enum ControlEvaluation {
    Satisfied(IndexSet<ControlOrigin>),

    NotSatisfied(IndexSet<ControlOrigin>),

    Conditional(IndexSet<ControlOrigin>),
}

impl Not for ControlEvaluation {
    type Output = Self;

    fn not(self) -> Self::Output {
        match self {
            Self::Satisfied(origins) => Self::NotSatisfied(origins),
            Self::NotSatisfied(origins) => Self::Satisfied(origins),
            Self::Conditional(origins) => Self::Conditional(origins),
        }
    }
}

impl BitAnd for ControlEvaluation {
    type Output = Self;

    fn bitand(self, rhs: Self) -> Self::Output {
        match (self, rhs) {
            (Self::NotSatisfied(mut lhs), Self::NotSatisfied(rhs)) => {
                lhs.extend(rhs);
                Self::NotSatisfied(lhs)
            }
            (Self::NotSatisfied(origins), _) | (_, Self::NotSatisfied(origins)) => {
                Self::NotSatisfied(origins)
            }
            (Self::Conditional(mut lhs), Self::Conditional(rhs)) => {
                lhs.extend(rhs);
                Self::Conditional(lhs)
            }
            (Self::Conditional(origins), Self::Satisfied(_))
            | (Self::Satisfied(_), Self::Conditional(origins)) => Self::Conditional(origins),
            (Self::Satisfied(mut lhs), Self::Satisfied(rhs)) => {
                lhs.extend(rhs);
                Self::Satisfied(lhs)
            }
        }
    }
}

impl BitOr for ControlEvaluation {
    type Output = Self;

    fn bitor(self, rhs: Self) -> Self::Output {
        match (self, rhs) {
            (Self::Satisfied(mut lhs), Self::Satisfied(rhs)) => {
                lhs.extend(rhs);
                Self::Satisfied(lhs)
            }
            (Self::Satisfied(origins), _) | (_, Self::Satisfied(origins)) => {
                Self::Satisfied(origins)
            }
            (Self::Conditional(mut lhs), Self::Conditional(rhs)) => {
                lhs.extend(rhs);
                Self::Conditional(lhs)
            }
            (Self::Conditional(origins), Self::NotSatisfied(_))
            | (Self::NotSatisfied(_), Self::Conditional(origins)) => Self::Conditional(origins),
            (Self::NotSatisfied(mut lhs), Self::NotSatisfied(rhs)) => {
                lhs.extend(rhs);
                Self::NotSatisfied(lhs)
            }
        }
    }
}

pub(crate) enum VersionBound<'a> {
    #[allow(dead_code)]
    Exact(Version<'a>),
    LessThan(Version<'a>),
    #[allow(dead_code)]
    GreaterThan(Version<'a>),
}

impl VersionBound<'_> {
    fn eval(&self, uses: &RepositoryUses, comments: &[Comment]) -> ControlEvaluation {
        let version = if let Some(sym_ref) = uses.symbolic_ref() {
            Version::parse(sym_ref).ok()
        } else {
            comments.iter().find_map(Version::from_comment)
        };

        let Some(ref version) = version else {
            return ControlEvaluation::Conditional(indexset! { ControlOrigin::UsesRef });
        };

        let satisfied = match self {
            VersionBound::Exact(control) => version == control,
            VersionBound::LessThan(control) => version < control,
            VersionBound::GreaterThan(control) => version > control,
        };

        if satisfied {
            ControlEvaluation::Satisfied(indexset! { ControlOrigin::UsesRef })
        } else {
            ControlEvaluation::NotSatisfied(indexset! { ControlOrigin::UsesRef })
        }
    }
}

pub(crate) enum ControlExpr<'a> {
    VersionBound(VersionBound<'a>),

    Field {
        toggle: Toggle,

        field_name: &'static str,

        field_type: ControlFieldType,

        satisfied_by_default: bool,
    },

    All(Vec<Self>),

    Any(Vec<Self>),

    Not(Box<Self>),
}

impl ControlExpr<'_> {
    pub(crate) fn field(
        toggle: Toggle,
        field_name: &'static str,
        field_type: ControlFieldType,
        enabled_by_default: bool,
    ) -> Self {
        Self::Field {
            toggle,
            field_name,
            field_type,
            satisfied_by_default: enabled_by_default,
        }
    }

    pub(crate) fn all(exprs: impl IntoIterator<Item = Self>) -> Self {
        Self::All(exprs.into_iter().collect())
    }

    pub(crate) fn any(exprs: impl IntoIterator<Item = Self>) -> Self {
        Self::Any(exprs.into_iter().collect())
    }

    pub(crate) fn not(expr: Self) -> Self {
        Self::Not(Box::new(expr))
    }

    fn eval(
        &self,
        uses: &RepositoryUses,
        comments: &[Comment],
        with: &IndexMap<String, EnvValue>,
    ) -> ControlEvaluation {
        match self {
            Self::VersionBound(vb) => vb.eval(uses, comments),
            Self::Field {
                toggle,
                field_name,
                field_type,
                satisfied_by_default: enabled_by_default,
            } => {
                if let Some(field_value) = with.get(*field_name) {
                    let control_value = match field_type {
                        ControlFieldType::Boolean => match field_value.to_string().as_str() {
                            "true" => Some(true),
                            "false" => Some(false),
                            other => match ExtractedExpr::from_fenced(other) {
                                Some(_) => None,

                                None => Some(true),
                            },
                        },

                        ControlFieldType::FreeString => Some(!field_value.is_empty()),

                        ControlFieldType::Exact(items) => {
                            let value = field_value.to_string();
                            if ExtractedExpr::from_fenced(&value).is_some() {
                                None
                            } else {
                                Some(items.contains(&value.as_str()))
                            }
                        }
                    };

                    let origins = indexset! { ControlOrigin::Input { field: field_name } };
                    match (control_value, toggle) {
                        (None, _) => ControlEvaluation::Conditional(origins),
                        (Some(true), Toggle::OptIn) | (Some(false), Toggle::OptOut) => {
                            ControlEvaluation::Satisfied(origins)
                        }
                        (Some(false), Toggle::OptIn) | (Some(true), Toggle::OptOut) => {
                            ControlEvaluation::NotSatisfied(origins)
                        }
                    }
                } else if *enabled_by_default {
                    ControlEvaluation::Satisfied(indexset! {
                        ControlOrigin::Default { field: field_name }
                    })
                } else {
                    ControlEvaluation::NotSatisfied(indexset! {
                        ControlOrigin::Default { field: field_name }
                    })
                }
            }
            Self::All(exprs) => exprs
                .iter()
                .map(|expr| expr.eval(uses, comments, with))
                .fold(
                    ControlEvaluation::Satisfied(IndexSet::new()),
                    |acc, expr| acc & expr,
                ),
            Self::Any(exprs) => exprs
                .iter()
                .map(|expr| expr.eval(uses, comments, with))
                .fold(
                    ControlEvaluation::NotSatisfied(IndexSet::new()),
                    |acc, expr| acc | expr,
                ),
            Self::Not(expr) => !expr.eval(uses, comments, with),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum Usage {
    Enabled(IndexSet<ControlOrigin>),
    Conditional(IndexSet<ControlOrigin>),
    Always,
}

#[cfg(test)]
mod tests {
    use std::str::FromStr as _;

    use github_actions_models::common::{EnvValue, RepositoryUses};
    use indexmap::{IndexMap, indexset};

    use super::{
        ActionCoordinate, ControlEvaluation, ControlExpr, ControlFieldType, ControlOrigin, Toggle,
        Usage, VersionBound,
    };
    use crate::features::audit_workflow::{
        models::{
            uses::RepositoryUsesPattern,
            version::Version,
            workflow::{Job, Step, Workflow},
        },
        registry::input::InputKey,
    };

    #[test]
    fn test_freestring_control() {
        let optin_control =
            ControlExpr::field(Toggle::OptIn, "set-me", ControlFieldType::FreeString, false);
        let optout_control =
            ControlExpr::field(Toggle::OptOut, "set-me", ControlFieldType::FreeString, true);

        let uses = RepositoryUses::parse("foo/bar@doesnotmatter").unwrap();
        let with_enabled = IndexMap::from([("set-me".into(), EnvValue::String("anything".into()))]);
        let with_disabled = IndexMap::from([("set-me".into(), EnvValue::String(String::new()))]);

        assert_eq!(
            optin_control.eval(&uses, &[], &with_enabled),
            ControlEvaluation::Satisfied(indexset! {
                ControlOrigin::Input { field: "set-me" }
            })
        );
        assert_eq!(
            optin_control.eval(&uses, &[], &with_disabled),
            ControlEvaluation::NotSatisfied(indexset! {
                ControlOrigin::Input { field: "set-me" }
            })
        );
        assert_eq!(
            optout_control.eval(&uses, &[], &with_enabled),
            ControlEvaluation::NotSatisfied(indexset! {
                ControlOrigin::Input { field: "set-me" }
            })
        );
        assert_eq!(
            optout_control.eval(&uses, &[], &with_disabled),
            ControlEvaluation::Satisfied(indexset! {
                ControlOrigin::Input { field: "set-me" }
            })
        );
    }

    #[test]
    fn test_exact_control() {
        let control = ControlExpr::field(
            Toggle::OptIn,
            "set-me",
            ControlFieldType::Exact(&["yes"]),
            false,
        );
        let uses = RepositoryUses::parse("foo/bar@doesnotmatter").unwrap();

        for (value, expected) in [
            (
                EnvValue::String("yes".into()),
                ControlEvaluation::Satisfied(indexset! {
                    ControlOrigin::Input { field: "set-me" }
                }),
            ),
            (
                EnvValue::String("no".into()),
                ControlEvaluation::NotSatisfied(indexset! {
                    ControlOrigin::Input { field: "set-me" }
                }),
            ),
            (
                EnvValue::String("${{ expression }}".into()),
                ControlEvaluation::Conditional(indexset! {
                    ControlOrigin::Input { field: "set-me" }
                }),
            ),
        ] {
            let with = IndexMap::from([("set-me".into(), value)]);
            assert_eq!(control.eval(&uses, &[], &with), expected);
        }
    }

    #[test]
    fn test_version_bound_provenance() {
        let control = ControlExpr::any([
            ControlExpr::field(
                Toggle::OptIn,
                "enable-cache",
                ControlFieldType::Exact(&["true"]),
                false,
            ),
            ControlExpr::all([
                ControlExpr::VersionBound(VersionBound::LessThan(Version::parse("v10").unwrap())),
                ControlExpr::field(
                    Toggle::OptIn,
                    "enable-cache",
                    ControlFieldType::Boolean,
                    true,
                ),
            ]),
        ]);

        let v6 = RepositoryUses::parse("foo/bar@v6.5.0").unwrap();
        assert_eq!(
            control.eval(&v6, &[], &IndexMap::new()),
            ControlEvaluation::Satisfied(indexset! {
                ControlOrigin::UsesRef,
                ControlOrigin::Default {
                    field: "enable-cache"
                },
            })
        );

        let explicit = IndexMap::from([("enable-cache".into(), EnvValue::Boolean(true))]);
        assert_eq!(
            control.eval(&v6, &[], &explicit),
            ControlEvaluation::Satisfied(indexset! {
                ControlOrigin::Input {
                    field: "enable-cache"
                },
                ControlOrigin::UsesRef,
            })
        );

        let v10 = RepositoryUses::parse("foo/bar@v10.0.0").unwrap();
        assert_eq!(
            control.eval(&v10, &[], &explicit),
            ControlEvaluation::Satisfied(indexset! {
                ControlOrigin::Input {
                    field: "enable-cache"
                }
            })
        );
        assert!(matches!(
            control.eval(&v10, &[], &IndexMap::new()),
            ControlEvaluation::NotSatisfied(_)
        ));

        let automatic = IndexMap::from([("enable-cache".into(), EnvValue::String("auto".into()))]);
        assert!(matches!(
            control.eval(&v10, &[], &automatic),
            ControlEvaluation::NotSatisfied(_)
        ));
        assert_eq!(
            control.eval(&v6, &[], &automatic),
            ControlEvaluation::Satisfied(indexset! {
                ControlOrigin::UsesRef,
                ControlOrigin::Input {
                    field: "enable-cache"
                },
            })
        );

        let disabled = IndexMap::from([("enable-cache".into(), EnvValue::Boolean(false))]);
        assert!(matches!(
            control.eval(&v6, &[], &disabled),
            ControlEvaluation::NotSatisfied(_)
        ));

        let unknown =
            RepositoryUses::parse("foo/bar@d9e0f98d3fc6adb07d1e3d37f3043649ddad06a1").unwrap();
        assert_eq!(
            control.eval(&unknown, &[], &IndexMap::new()),
            ControlEvaluation::Conditional(indexset! { ControlOrigin::UsesRef })
        );
    }

    const USAGE_WORKFLOW: &str = r"
    name: test_usage
    on: push
    jobs:
      test_usage:
        runs-on: ubuntu-latest
        steps:
          - uses: foo/bar@v1      # 0

          - uses: foo/bar@v1      # 1

          - uses: not/thesame@v1  # 2
            with:
              set-me: true

          - uses: not/thesame@v1  # 3

          - uses: foo/bar@v1      # 4
            with:
              set-me: true

          - uses: foo/bar@v1      # 5
            with:
              set-me: false

          - uses: foo/bar@v1      # 6
            with:
              disable-cache: true

          - uses: foo/bar@v1      # 7
            with:
              disable-cache: false

          - uses: foo/bar@v1      # 8
            with: ${{ fromJson(steps.setup.outputs.options) }}
    ";

    fn with_usage_steps(check: impl FnOnce(&[Step<'_>])) {
        let workflow =
            Workflow::from_string(USAGE_WORKFLOW, InputKey::local("dummy", None)).unwrap();

        let Job::NormalJob(job) = workflow.jobs().next().unwrap() else {
            panic!("Expected a normal job");
        };

        let steps = job.steps().collect::<Vec<_>>();
        check(&steps);
    }

    #[test]
    fn test_usage_opt_in() {
        with_usage_steps(|steps| {
            let coord = ActionCoordinate::NotConfigurable(
                RepositoryUsesPattern::from_str("foo/bar").unwrap(),
            );
            let step = &steps[3];
            assert_eq!(coord.usage(step), None);

            for step in &[&steps[0], &steps[1]] {
                assert_eq!(coord.usage(*step), Some(Usage::Always));
            }

            let coord = ActionCoordinate::Configurable {
                uses_pattern: RepositoryUsesPattern::from_str("foo/bar").unwrap(),
                control: ControlExpr::field(
                    Toggle::OptIn,
                    "set-me",
                    ControlFieldType::Boolean,
                    false,
                ),
            };
            let step = &steps[0];
            assert_eq!(coord.usage(step), None);

            let step = &steps[4];
            assert_eq!(
                coord.usage(step),
                Some(Usage::Enabled(indexset! {
                    ControlOrigin::Input { field: "set-me" }
                }))
            );

            let step = &steps[5];
            assert_eq!(coord.usage(step), None);

            let coord = ActionCoordinate::Configurable {
                uses_pattern: RepositoryUsesPattern::from_str("foo/bar").unwrap(),
                control: ControlExpr::field(
                    Toggle::OptIn,
                    "set-me",
                    ControlFieldType::Boolean,
                    true,
                ),
            };
            let step = &steps[0];
            assert_eq!(
                coord.usage(step),
                Some(Usage::Enabled(indexset! {
                    ControlOrigin::Default { field: "set-me" }
                }))
            );

            let step = &steps[4];
            assert_eq!(
                coord.usage(step),
                Some(Usage::Enabled(indexset! {
                    ControlOrigin::Input { field: "set-me" }
                }))
            );

            let step = &steps[5];
            assert_eq!(coord.usage(step), None);
        });
    }

    #[test]
    fn test_usage_opt_out() {
        with_usage_steps(|steps| {
            let coord = ActionCoordinate::Configurable {
                uses_pattern: RepositoryUsesPattern::from_str("foo/bar").unwrap(),
                control: ControlExpr::field(
                    Toggle::OptOut,
                    "disable-cache",
                    ControlFieldType::Boolean,
                    false,
                ),
            };
            let step = &steps[0];
            assert_eq!(coord.usage(step), None);

            let step = &steps[6];
            assert_eq!(coord.usage(step), None);

            let step = &steps[7];
            assert_eq!(
                coord.usage(step),
                Some(Usage::Enabled(indexset! {
                    ControlOrigin::Input {
                        field: "disable-cache"
                    }
                }))
            );

            let step = &steps[8];
            assert_eq!(
                coord.usage(step),
                Some(Usage::Conditional(indexset! {
                    ControlOrigin::WithExpression
                }))
            );
        });
    }
}

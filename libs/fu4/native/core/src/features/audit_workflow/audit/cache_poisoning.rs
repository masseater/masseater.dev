use indexmap::IndexSet;
use std::sync::LazyLock;

use github_actions_expressions::call::{Call, Function};
use github_actions_expressions::literal::Literal;
use github_actions_expressions::op::{BinExpr, BinOp, UnOp};
use github_actions_expressions::{Expr, SpannedExpr};
use github_actions_models::common::expr::LoE;
use github_actions_models::common::{CacheMode, EnvValue};
use github_actions_models::workflow::Trigger;
use github_actions_models::workflow::event::{BranchFilters, OptionalBody};

use crate::features::audit_workflow::audit::{Audit, AuditError, audit_meta};
use crate::features::audit_workflow::finding::location::{Locatable as _, SymbolicLocation};
use crate::features::audit_workflow::finding::{Confidence, Finding, Persona, Severity};
use crate::features::audit_workflow::models::coordinate::{
    ActionCoordinate, ControlExpr, ControlFieldType, ControlOrigin, Toggle, Usage, VersionBound,
};
use crate::features::audit_workflow::models::version::Version;
use crate::features::audit_workflow::models::workflow::cache_mode::{
    EffectiveCacheMode, HasEffectiveCacheMode as _,
};
use crate::features::audit_workflow::models::workflow::{
    JobCommon, NormalJob, ReusableWorkflowCallJob, Step, Steps,
};
use crate::features::audit_workflow::models::{StepBodyCommon, StepCommon};
use crate::features::audit_workflow::state::AuditState;
use crate::features::audit_workflow::utils::ExtractedExpr;

use super::AuditLoadError;

const TAG_REF_PREFIX: &str = "refs/tags/";

static REF_TYPE_TAG_PUSH_GUARD: LazyLock<Expr> = LazyLock::new(|| {
    Expr::parse("github.event_name == 'push' && github.ref_type == 'tag'")
        .expect("impossible")
        .inner
});

struct CacheAwareAction {
    coordinate: ActionCoordinate,
}

impl From<ActionCoordinate> for CacheAwareAction {
    fn from(coordinate: ActionCoordinate) -> Self {
        Self { coordinate }
    }
}

static KNOWN_CACHE_AWARE_ACTIONS: LazyLock<Vec<CacheAwareAction>> = LazyLock::new(|| {
    vec![
        ActionCoordinate::Configurable {
            uses_pattern: "actions/cache".parse().unwrap(),
            control: ControlExpr::field(
                Toggle::OptOut,
                "lookup-only",
                ControlFieldType::Boolean,
                true,
            ),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "actions/setup-java".parse().unwrap(),
            control: ControlExpr::field(
                Toggle::OptIn,
                "cache",
                ControlFieldType::FreeString,
                false,
            ),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "actions/setup-go".parse().unwrap(),
            control: ControlExpr::field(Toggle::OptIn, "cache", ControlFieldType::Boolean, true),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "actions/setup-node".parse().unwrap(),
            control: ControlExpr::any([
                ControlExpr::field(
                    Toggle::OptIn,
                    "cache",
                    ControlFieldType::Exact(&["npm", "yarn", "pnpm"]),
                    false,
                ),
                ControlExpr::field(
                    Toggle::OptIn,
                    "package-manager-cache",
                    ControlFieldType::Boolean,
                    true,
                ),
            ]),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "actions/setup-python".parse().unwrap(),
            control: ControlExpr::field(
                Toggle::OptIn,
                "cache",
                ControlFieldType::FreeString,
                false,
            ),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "actions/setup-dotnet".parse().unwrap(),
            control: ControlExpr::field(Toggle::OptIn, "cache", ControlFieldType::Boolean, false),
        }
        .into(),
        CacheAwareAction {
            coordinate: ActionCoordinate::Configurable {
                uses_pattern: "astral-sh/setup-uv".parse().unwrap(),
                control: ControlExpr::any([
                    ControlExpr::field(
                        Toggle::OptIn,
                        "enable-cache",
                        ControlFieldType::Exact(&["true"]),
                        false,
                    ),
                    ControlExpr::all([
                        ControlExpr::VersionBound(VersionBound::LessThan(
                            Version::parse("v10").unwrap(),
                        )),
                        ControlExpr::field(
                            Toggle::OptIn,
                            "enable-cache",
                            ControlFieldType::Boolean,
                            true,
                        ),
                    ]),
                ]),
            },
        },
        ActionCoordinate::Configurable {
            uses_pattern: "Swatinem/rust-cache".parse().unwrap(),
            control: ControlExpr::field(
                Toggle::OptOut,
                "lookup-only",
                ControlFieldType::Boolean,
                true,
            ),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "ruby/setup-ruby".parse().unwrap(),
            control: ControlExpr::field(
                Toggle::OptIn,
                "bundler-cache",
                ControlFieldType::Boolean,
                false,
            ),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "PyO3/maturin-action".parse().unwrap(),
            control: ControlExpr::field(Toggle::OptIn, "sccache", ControlFieldType::Boolean, false),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "mlugg/setup-zig".parse().unwrap(),
            control: ControlExpr::field(
                Toggle::OptIn,
                "use-cache",
                ControlFieldType::Boolean,
                true,
            ),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "oven-sh/setup-bun".parse().unwrap(),
            control: ControlExpr::field(
                Toggle::OptOut,
                "no-cache",
                ControlFieldType::Boolean,
                true,
            ),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "pnpm/setup".parse().unwrap(),
            control: ControlExpr::field(Toggle::OptIn, "cache", ControlFieldType::Boolean, false),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "DeterminateSystems/magic-nix-cache-action".parse().unwrap(),
            control: ControlExpr::field(
                Toggle::OptIn,
                "use-gha-cache",
                ControlFieldType::Boolean,
                true,
            ),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "graalvm/setup-graalvm".parse().unwrap(),
            control: ControlExpr::field(
                Toggle::OptIn,
                "cache",
                ControlFieldType::FreeString,
                false,
            ),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "gradle/actions/setup-gradle".parse().unwrap(),
            control: ControlExpr::field(
                Toggle::OptOut,
                "cache-disabled",
                ControlFieldType::Boolean,
                true,
            ),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "docker/setup-buildx-action".parse().unwrap(),
            control: ControlExpr::all([
                ControlExpr::field(
                    Toggle::OptIn,
                    "cache-binary",
                    ControlFieldType::Boolean,
                    true,
                ),
                ControlExpr::field(
                    Toggle::OptIn,
                    "version",
                    ControlFieldType::FreeString,
                    false,
                ),
            ]),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "actions-rust-lang/setup-rust-toolchain".parse().unwrap(),
            control: ControlExpr::field(Toggle::OptIn, "cache", ControlFieldType::Boolean, true),
        }
        .into(),
        ActionCoordinate::NotConfigurable("Mozilla-Actions/sccache-action".parse().unwrap()).into(),
        ActionCoordinate::NotConfigurable("nix-community/cache-nix-action".parse().unwrap()).into(),
        ActionCoordinate::Configurable {
            uses_pattern: "jdx/mise-action".parse().unwrap(),
            control: ControlExpr::field(Toggle::OptIn, "cache", ControlFieldType::Boolean, true),
        }
        .into(),
        ActionCoordinate::Configurable {
            uses_pattern: "ramsey/composer-install".parse().unwrap(),
            control: ControlExpr::Field {
                toggle: Toggle::OptOut,
                field_name: "ignore-cache",
                field_type: ControlFieldType::Exact(&["yes", "true", "1"]),
                satisfied_by_default: true,
            },
        }
        .into(),
        ActionCoordinate::NotConfigurable("awalsh128/cache-apt-pkgs-action".parse().unwrap())
            .into(),
    ]
});

static KNOWN_PUBLISHER_ACTIONS: LazyLock<Vec<ActionCoordinate>> = LazyLock::new(|| {
    vec![
        ActionCoordinate::NotConfigurable("pypa/gh-action-pypi-publish".parse().unwrap()),
        ActionCoordinate::NotConfigurable("rubygems/release-gem".parse().unwrap()),
        ActionCoordinate::NotConfigurable("jreleaser/release-action".parse().unwrap()),
        ActionCoordinate::NotConfigurable("goreleaser/goreleaser-action".parse().unwrap()),
        ActionCoordinate::NotConfigurable("softprops/action-gh-release".parse().unwrap()),
        ActionCoordinate::NotConfigurable("release-drafter/release-drafter".parse().unwrap()),
        ActionCoordinate::NotConfigurable("googleapis/release-please-action".parse().unwrap()),
        ActionCoordinate::Configurable {
            uses_pattern: "docker/build-push-action".parse().unwrap(),
            control: ControlExpr::field(Toggle::OptIn, "push", ControlFieldType::Boolean, true),
        },
        ActionCoordinate::NotConfigurable("redhat-actions/push-to-registry".parse().unwrap()),
        ActionCoordinate::NotConfigurable(
            "aws-actions/amazon-ecs-deploy-task-definition"
                .parse()
                .unwrap(),
        ),
        ActionCoordinate::NotConfigurable(
            "aws-actions/aws-cloudformation-github-deploy"
                .parse()
                .unwrap(),
        ),
        ActionCoordinate::NotConfigurable("Azure/aci-deploy".parse().unwrap()),
        ActionCoordinate::NotConfigurable("Azure/container-apps-deploy-action".parse().unwrap()),
        ActionCoordinate::NotConfigurable("Azure/functions-action".parse().unwrap()),
        ActionCoordinate::NotConfigurable("Azure/sql-action".parse().unwrap()),
        ActionCoordinate::NotConfigurable("cloudflare/wrangler-action".parse().unwrap()),
        ActionCoordinate::NotConfigurable(
            "google-github-actions/deploy-appengine".parse().unwrap(),
        ),
        ActionCoordinate::NotConfigurable("google-github-actions/deploy-cloudrun".parse().unwrap()),
        ActionCoordinate::NotConfigurable(
            "google-github-actions/deploy-cloud-functions"
                .parse()
                .unwrap(),
        ),
    ]
});

enum ReleaseTrigger {
    TagPush,

    ReleaseBranchPush,

    ReleaseEvent,
}

enum PublishingScenario<'doc> {
    UsingReleaseTriggers(Vec<ReleaseTrigger>),

    UsingReleaseAction(Step<'doc>),
}

enum CacheControlExpr {
    Bool(bool),

    StartsWithGithubRefTagPrefix,

    RefTypeTagPush,

    Not(Box<Self>),
}

impl CacheControlExpr {
    fn parse(raw: &str) -> Option<Self> {
        let extracted = ExtractedExpr::from_fenced(raw)?;
        let parsed = Expr::parse(extracted.as_bare()).ok()?;
        Self::from_spanned(&parsed)
    }

    fn from_spanned(expr: &SpannedExpr) -> Option<Self> {
        match &expr.inner {
            Expr::Literal(Literal::Boolean(value)) => Some(Self::Bool(*value)),
            Expr::UnExpr {
                op: UnOp::Not,
                expr,
            } => Some(Self::Not(Box::new(Self::from_spanned(expr)?))),
            Expr::Call(Call {
                func: Function::StartsWith,
                args,
            }) => {
                if let [lhs, rhs] = args.as_slice()
                    && let Expr::Context(ctx) = &lhs.inner
                    && ctx.matches("github.ref")
                    && let Expr::Literal(Literal::String(prefix)) = &rhs.inner
                    && prefix.eq_ignore_ascii_case(TAG_REF_PREFIX)
                {
                    Some(Self::StartsWithGithubRefTagPrefix)
                } else {
                    None
                }
            }
            expr @ Expr::BinExpr(BinExpr { op: BinOp::And, .. }) => {
                if expr.commutative_matches(&REF_TYPE_TAG_PUSH_GUARD) {
                    Some(Self::RefTypeTagPush)
                } else {
                    None
                }
            }

            _ => None,
        }
    }

    fn eval_for_tag_push(&self) -> bool {
        match self {
            Self::Bool(value) => *value,
            Self::Not(expr) => !expr.eval_for_tag_push(),
            Self::StartsWithGithubRefTagPrefix | Self::RefTypeTagPush => true,
        }
    }
}

struct CacheControlField<'a> {
    toggle: Toggle,
    raw_value: &'a EnvValue,
}

impl<'a> CacheControlField<'a> {
    fn extract(coord: &'a ActionCoordinate, step: &'a impl StepCommon<'a>) -> Option<Self> {
        if let ActionCoordinate::Configurable { control, .. } = coord
            && let ControlExpr::Field {
                toggle,
                field_name,
                field_type: ControlFieldType::Boolean,
                ..
            } = control
            && let Some(StepBodyCommon::Uses {
                with: LoE::Literal(with),
                ..
            }) = step.body()
            && let Some(raw_value) = with.get(*field_name)
        {
            Some(CacheControlField {
                toggle: *toggle,
                raw_value,
            })
        } else {
            None
        }
    }
}

pub(crate) struct CachePoisoning;

audit_meta!(
    CachePoisoning,
    "cache-poisoning",
    "runtime artifacts potentially vulnerable to a cache poisoning attack"
);

impl CachePoisoning {
    fn dangerous_trigger_writes_cache<'doc>(
        job: &impl JobCommon<'doc>,
    ) -> Result<Option<Finding<'doc>>, AuditError> {
        let workflow = job.parent();

        let Some(trigger_location) = workflow
            .pull_request_target()
            .or_else(|| workflow.workflow_run())
            .or_else(|| workflow.issue_comment())
        else {
            return Ok(None);
        };

        let EffectiveCacheMode {
            mode: CacheMode::Write | CacheMode::WriteOnly,
            location: Some(cache_mode_location),
        } = job.effective_cache_mode()
        else {
            return Ok(None);
        };

        Ok(Some(
            Self::finding()
                .confidence(Confidence::High)
                .severity(Severity::High)
                .persona(Persona::Regular)
                .add_location(
                    job.location_with_grip()
                        .annotated("this job can write to the cache"),
                )
                .add_location(
                    trigger_location
                        .annotated("trigger provides elevated access to external actors"),
                )
                .add_location(
                    cache_mode_location
                        .primary()
                        .annotated("cache writes enabled here"),
                )
                .build(job.parent())?,
        ))
    }

    fn triggers_used_when_publishing_artifacts(trigger: &Trigger) -> Vec<ReleaseTrigger> {
        let events = &trigger.events;
        let mut triggers = vec![];

        if let OptionalBody::Body(body) = &events.push {
            if body.tag_filters.is_some() {
                triggers.push(ReleaseTrigger::TagPush);
            }

            if let Some(BranchFilters::Branches(branches)) = &body.branch_filters
                && branches
                    .iter()
                    .any(|branch| branch.to_lowercase().contains("release"))
            {
                triggers.push(ReleaseTrigger::ReleaseBranchPush);
            }
        }

        if events.release.is_present() {
            triggers.push(ReleaseTrigger::ReleaseEvent);
        }

        triggers
    }

    fn detected_well_known_publisher_step(steps: Steps) -> Option<Step> {
        steps.into_iter().find(|step| {
            KNOWN_PUBLISHER_ACTIONS
                .iter()
                .any(|publisher| publisher.usage(step).is_some())
        })
    }

    fn is_job_publishing_artifacts<'doc>(
        trigger: &Trigger,
        steps: Steps<'doc>,
    ) -> Option<PublishingScenario<'doc>> {
        let triggers = Self::triggers_used_when_publishing_artifacts(trigger);
        if !triggers.is_empty() {
            return Some(PublishingScenario::UsingReleaseTriggers(triggers));
        }

        let well_know_publisher = Self::detected_well_known_publisher_step(steps)?;
        Some(PublishingScenario::UsingReleaseAction(well_know_publisher))
    }

    fn evaluate_cache_usage<'doc>(
        step: &impl StepCommon<'doc>,
    ) -> Option<(&'static CacheAwareAction, Usage)> {
        KNOWN_CACHE_AWARE_ACTIONS
            .iter()
            .find_map(|action| action.coordinate.usage(step).map(|usage| (action, usage)))
    }

    fn conditional_cache_usage_heuristics<'doc>(
        coord: &ActionCoordinate,
        step: &Step<'doc>,
        scenario: &PublishingScenario<'doc>,
        cache_usage: Usage,
    ) -> Option<Usage> {
        if let PublishingScenario::UsingReleaseTriggers(triggers) = scenario
            && triggers
                .iter()
                .all(|t| matches!(t, ReleaseTrigger::TagPush | ReleaseTrigger::ReleaseEvent))
            && let Some(control) = CacheControlField::extract(coord, step)
            && let Some(expr) = CacheControlExpr::parse(&control.raw_value.to_string())
        {
            let control_value = expr.eval_for_tag_push();

            let cache_enabled = match control.toggle {
                Toggle::OptIn => control_value,
                Toggle::OptOut => !control_value,
            };

            if cache_enabled {
                Some(match cache_usage {
                    Usage::Conditional(origins) => Usage::Enabled(origins),
                    usage => usage,
                })
            } else {
                None
            }
        } else {
            Some(cache_usage)
        }
    }

    fn origin_locations<'doc>(
        step: &Step<'doc>,
        origins: &IndexSet<ControlOrigin>,
        annotation: &'static str,
    ) -> Vec<SymbolicLocation<'doc>> {
        origins
            .iter()
            .filter_map(|origin| match origin {
                ControlOrigin::Input { field } => {
                    Some(step.location().with_keys(["with".into(), (*field).into()]))
                }
                ControlOrigin::WithExpression => Some(step.location().with_keys(["with".into()])),
                ControlOrigin::Default { .. } | ControlOrigin::UsesRef => None,
            })
            .map(|location| location.annotated(annotation))
            .collect()
    }

    fn uses_cache_aware_step<'doc>(
        step: &Step<'doc>,
        scenario: &PublishingScenario<'doc>,
    ) -> Result<Option<Finding<'doc>>, AuditError> {
        let Some((action, cache_usage)) = Self::evaluate_cache_usage(step) else {
            return Ok(None);
        };
        let coord = &action.coordinate;

        let cache_usage = if matches!(&cache_usage, Usage::Conditional(_)) {
            Self::conditional_cache_usage_heuristics(coord, step, scenario, cache_usage)
        } else {
            Some(cache_usage)
        };

        let Some(cache_usage) = cache_usage else {
            return Ok(None);
        };

        let locations = match &cache_usage {
            Usage::Conditional(origins) => {
                let version_is_conditional = origins.contains(&ControlOrigin::UsesRef);
                let mut uses_location = step.location().primary().with_keys(["uses".into()]);
                if version_is_conditional {
                    uses_location = uses_location.annotated("action version may enable caching");
                }

                std::iter::once(uses_location)
                    .chain(Self::origin_locations(
                        step,
                        origins,
                        "may enable caching here",
                    ))
                    .collect()
            }
            Usage::Enabled(origins) => {
                let has_explicit_origin = origins.iter().any(|origin| {
                    matches!(
                        origin,
                        ControlOrigin::Input { .. } | ControlOrigin::WithExpression
                    )
                });
                let default_fields = origins
                    .iter()
                    .filter_map(|origin| match origin {
                        ControlOrigin::Default { field } => Some(format!("`{field}`")),
                        _ => None,
                    })
                    .collect::<Vec<_>>();

                let default_annotation = if default_fields.is_empty() {
                    (!has_explicit_origin).then(|| "enables caching by default".to_string())
                } else {
                    let version_qualifier = if origins.contains(&ControlOrigin::UsesRef) {
                        " for this action version"
                    } else {
                        ""
                    };
                    Some(format!(
                        "omitting {} enables caching{version_qualifier}",
                        default_fields.join(" and ")
                    ))
                };

                let mut uses_location = step.location().primary().with_keys(["uses".into()]);
                if let Some(annotation) = default_annotation {
                    uses_location = uses_location.annotated(annotation);
                }

                std::iter::once(uses_location)
                    .chain(Self::origin_locations(
                        step,
                        origins,
                        "enables caching explicitly here",
                    ))
                    .collect()
            }
            Usage::Always => vec![
                step.location()
                    .primary()
                    .with_keys(["uses".into()])
                    .annotated("always restores from cache"),
            ],
        };

        let mut finding_builder = match scenario {
            PublishingScenario::UsingReleaseTriggers(_) => Self::finding()
                .confidence(Confidence::Low)
                .severity(Severity::High)
                .add_location(
                    step.workflow()
                        .location()
                        .with_keys(["on".into()])
                        .annotated("generally used when publishing artifacts generated at runtime"),
                ),
            PublishingScenario::UsingReleaseAction(publisher) => Self::finding()
                .confidence(Confidence::Low)
                .severity(Severity::High)
                .add_location(
                    publisher
                        .location()
                        .with_keys(["uses".into()])
                        .annotated("runtime artifacts usually published here"),
                ),
        };

        for location in locations {
            finding_builder = finding_builder.add_location(location);
        }

        finding_builder = finding_builder.add_location(step.location().hidden());

        Ok(Some(finding_builder.build(step)?))
    }
}

impl Audit for CachePoisoning {
    fn new(_state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized,
    {
        Ok(Self)
    }

    fn audit_normal_job<'doc>(
        &self,
        job: &NormalJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];
        let steps = job.steps();
        let trigger = &job.parent().on;

        if let Some(finding) = Self::dangerous_trigger_writes_cache(job)? {
            findings.push(finding);
        }

        let effective_cache_mode = job.effective_cache_mode();
        if let CacheMode::None = effective_cache_mode.mode {
            tracing::debug!("no cache poisoning is possible due to `cache-mode: none`");
            return Ok(findings);
        }

        let Some(scenario) = Self::is_job_publishing_artifacts(trigger, steps) else {
            return Ok(findings);
        };

        for step in job.steps() {
            if let Some(finding) = Self::uses_cache_aware_step(&step, &scenario)? {
                findings.push(finding);
            }
        }

        Ok(findings)
    }

    fn audit_reusable_job<'doc>(
        &self,
        job: &ReusableWorkflowCallJob<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        if let Some(finding) = Self::dangerous_trigger_writes_cache(job)? {
            Ok(vec![finding])
        } else {
            Ok(vec![])
        }
    }
}

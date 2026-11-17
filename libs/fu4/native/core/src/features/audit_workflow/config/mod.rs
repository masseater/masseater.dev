use std::{
    collections::{HashMap, HashSet},
    num::NonZeroUsize,
    ops::Deref,
    str::FromStr,
};

use anyhow::{Context as _, anyhow};
use github_actions_models::common::RepositoryUses;
use serde::{
    Deserialize,
    de::{self, DeserializeOwned},
};
use thiserror::Error;

use crate::features::audit_workflow::audit::self_hosted_runner::SelfHostedRunner;
use crate::features::audit_workflow::{
    audit::{
        AuditCore as _, dependabot_cooldown::DependabotCooldown, forbidden_uses::ForbiddenUses,
        known_vulnerable_actions::KnownVulnerableActions,
        secrets_outside_env::SecretsOutsideEnvironment, unpinned_uses::UnpinnedUses,
    },
    finding::{Finding, Severity},
    models::uses::RepositoryUsesPattern,
};

#[derive(Error, Debug)]
#[error("configuration error in {path}")]
pub(crate) struct ConfigError {
    path: String,

    pub(crate) source: ConfigErrorInner,
}

#[derive(Error, Debug)]
pub(crate) enum ConfigErrorInner {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("invalid configuration syntax")]
    Syntax(#[source] yaml_serde::Error),

    #[error("invalid syntax for audit `{1}`")]
    AuditSyntax(#[source] yaml_serde::Error, &'static str),

    #[error("invalid `unpinned-uses` config")]
    UnpinnedUsesConfig(#[from] UnpinnedUsesConfigError),
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct WorkflowRule {
    pub(crate) filename: String,

    pub(crate) line: Option<usize>,

    pub(crate) column: Option<usize>,
}

impl FromStr for WorkflowRule {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> anyhow::Result<Self, Self::Err> {
        let parts = s.rsplitn(3, ':').collect::<Vec<_>>();
        let mut parts = parts.iter().rev();

        let filename = parts
            .next()
            .ok_or_else(|| anyhow!("rule is missing a filename component"))?;

        if !matches!(filename.rsplit_once('.'), Some((_, "yml" | "yaml"))) {
            return Err(anyhow!("invalid workflow filename: {filename}"));
        }

        let line = parts
            .next()
            .map(|line| NonZeroUsize::from_str(line).map(std::num::NonZero::get))
            .transpose()
            .with_context(|| "invalid line number component (must be 1-based)")?;
        let column = parts
            .next()
            .map(|col| NonZeroUsize::from_str(col).map(std::num::NonZero::get))
            .transpose()
            .with_context(|| "invalid column number component (must be 1-based)")?;

        Ok(Self {
            filename: filename.to_string(),
            line,
            column,
        })
    }
}

impl<'de> Deserialize<'de> for WorkflowRule {
    fn deserialize<D>(deserializer: D) -> anyhow::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let raw = String::deserialize(deserializer)?;
        Self::from_str(&raw).map_err(de::Error::custom)
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum RemapSeverity {
    Informational,
    Low,
    Medium,
    High,
}

impl From<RemapSeverity> for Severity {
    fn from(value: RemapSeverity) -> Self {
        match value {
            RemapSeverity::Informational => Self::Informational,
            RemapSeverity::Low => Self::Low,
            RemapSeverity::Medium => Self::Medium,
            RemapSeverity::High => Self::High,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct RemapConfig {
    pub(crate) severity: Option<RemapSeverity>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct AuditRuleConfig {
    #[serde(default)]
    disable: bool,

    #[serde(default)]
    ignore: Vec<WorkflowRule>,

    #[serde(default)]
    config: Option<yaml_serde::Mapping>,

    #[serde(default)]
    remap: Option<RemapConfig>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
struct RawConfig {
    rules: HashMap<String, AuditRuleConfig>,
}

impl RawConfig {
    pub(crate) fn load(contents: &str) -> Result<Self, ConfigErrorInner> {
        yaml_serde::from_str(contents).map_err(ConfigErrorInner::Syntax)
    }

    fn rule_config<T>(&self, ident: &'static str) -> Result<Option<T>, ConfigErrorInner>
    where
        T: DeserializeOwned,
    {
        self.rules
            .get(ident)
            .and_then(|rule_config| rule_config.config.as_ref())
            .map(|policy| yaml_serde::from_value::<T>(yaml_serde::Value::Mapping(policy.clone())))
            .transpose()
            .map_err(|e| ConfigErrorInner::AuditSyntax(e, ident))
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "kebab-case", deny_unknown_fields)]
#[serde(default)]
pub(crate) struct DependabotCooldownConfig {
    pub(crate) days: NonZeroUsize,
}

impl Default for DependabotCooldownConfig {
    fn default() -> Self {
        Self {
            days: NonZeroUsize::new(7).expect("impossible"),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(transparent)]
pub(crate) struct ForbiddenUsesConfig(
    #[serde(with = "yaml_serde::with::singleton_map")] pub(crate) ForbiddenUsesConfigInner,
);

impl Deref for ForbiddenUsesConfig {
    type Target = ForbiddenUsesConfigInner;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "kebab-case", deny_unknown_fields)]
pub(crate) struct SelfHostedRunnerConfig {
    pub(crate) deny_runners: HashSet<String>,

    pub(crate) allow_groups: HashSet<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ForbiddenUsesConfigInner {
    Allow(Vec<RepositoryUsesPattern>),
    Deny(Vec<RepositoryUsesPattern>),
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "kebab-case", deny_unknown_fields)]
#[serde(default)]
pub(crate) struct SecretsOutsideEnvConfig {
    pub(crate) allow: Vec<String>,
}

#[derive(Clone, Debug)]
pub(crate) struct SecretsOutsideEnvPolicy {
    pub(crate) allow: HashSet<String>,
}

impl Default for SecretsOutsideEnvPolicy {
    fn default() -> Self {
        let mut allow = HashSet::new();
        allow.insert("github_token".into());

        Self { allow }
    }
}

impl From<SecretsOutsideEnvConfig> for SecretsOutsideEnvPolicy {
    fn from(value: SecretsOutsideEnvConfig) -> Self {
        let mut allow = value
            .allow
            .iter()
            .map(|item| item.to_ascii_lowercase())
            .collect::<HashSet<_>>();

        let default = Self::default();
        allow.extend(default.allow);

        Self { allow }
    }
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "kebab-case", deny_unknown_fields)]
pub(crate) struct UnpinnedUsesConfig {
    #[serde(default)]
    policies: HashMap<RepositoryUsesPattern, UsesPolicy>,
}

#[derive(Copy, Clone, Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum UsesPolicy {
    Any,

    RefPin,

    HashPin,
}

#[derive(Clone, Debug)]
pub(crate) struct UnpinnedUsesPolicies {
    policy_tree: HashMap<String, Vec<(RepositoryUsesPattern, UsesPolicy)>>,

    default_policy: UsesPolicy,
}

impl UnpinnedUsesPolicies {
    pub(crate) fn get_policy(
        &self,
        uses: &RepositoryUses,
    ) -> (Option<&RepositoryUsesPattern>, UsesPolicy) {
        match self.policy_tree.get(uses.owner()) {
            Some(policies) => {
                for (uses_pattern, policy) in policies {
                    if uses_pattern.matches(&uses.into()) {
                        return (Some(uses_pattern), *policy);
                    }
                }

                (None, self.default_policy)
            }
            None => (None, self.default_policy),
        }
    }
}

impl Default for UnpinnedUsesPolicies {
    fn default() -> Self {
        Self {
            policy_tree: [].into(),
            default_policy: UsesPolicy::HashPin,
        }
    }
}

#[derive(Error, Debug)]
pub(crate) enum UnpinnedUsesConfigError {
    #[error("cannot use exact ref patterns here: `{0}`")]
    ExactWithRefUsed(String),
}

impl TryFrom<UnpinnedUsesConfig> for UnpinnedUsesPolicies {
    type Error = UnpinnedUsesConfigError;

    fn try_from(config: UnpinnedUsesConfig) -> anyhow::Result<Self, Self::Error> {
        let mut policy_tree: HashMap<String, Vec<(RepositoryUsesPattern, UsesPolicy)>> =
            HashMap::new();
        let mut default_policy = UsesPolicy::HashPin;

        for (pattern, policy) in config.policies {
            match pattern {
                RepositoryUsesPattern::ExactWithRef { .. } => {
                    return Err(UnpinnedUsesConfigError::ExactWithRefUsed(
                        pattern.to_string(),
                    ));
                }
                RepositoryUsesPattern::ExactPath { ref owner, .. }
                | RepositoryUsesPattern::ExactRepo { ref owner, .. }
                | RepositoryUsesPattern::InRepo { ref owner, .. }
                | RepositoryUsesPattern::InOwner(ref owner) => {
                    policy_tree
                        .entry(owner.clone())
                        .or_default()
                        .push((pattern, policy));
                }
                RepositoryUsesPattern::Any => {
                    default_policy = policy;
                }
            }
        }

        for policies in policy_tree.values_mut() {
            policies.sort_by(|a, b| a.0.cmp(&b.0));
        }

        Ok(Self {
            policy_tree,
            default_policy,
        })
    }
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "kebab-case", deny_unknown_fields)]
pub(crate) struct KnownVulnerableActionsConfig {
    pub(crate) allow: HashSet<String>,
}

#[derive(Clone, Debug, Default)]
pub(crate) struct Config {
    raw: RawConfig,
    pub(crate) dependabot_cooldown: DependabotCooldownConfig,
    pub(crate) forbidden_uses: Option<ForbiddenUsesConfig>,
    pub(crate) secrets_outside_env_policy: SecretsOutsideEnvPolicy,
    pub(crate) unpinned_uses_policies: UnpinnedUsesPolicies,
    pub(crate) known_vulnerable_actions: KnownVulnerableActionsConfig,
    pub(crate) self_hosted_runner: SelfHostedRunnerConfig,
}

impl Config {
    pub(crate) fn load(contents: &str) -> Result<Self, ConfigErrorInner> {
        let raw = RawConfig::load(contents)?;

        let dependabot_cooldown = raw
            .rule_config(DependabotCooldown::ident())?
            .unwrap_or_default();

        let forbidden_uses = raw.rule_config(ForbiddenUses::ident())?;

        let secrets_outside_env_config =
            raw.rule_config::<SecretsOutsideEnvConfig>(SecretsOutsideEnvironment::ident())?;
        let secrets_outside_env_policy = secrets_outside_env_config
            .map(Into::into)
            .unwrap_or_default();

        let unpinned_uses_policies = {
            if let Some(unpinned_uses_config) =
                raw.rule_config::<UnpinnedUsesConfig>(UnpinnedUses::ident())?
            {
                UnpinnedUsesPolicies::try_from(unpinned_uses_config)?
            } else {
                UnpinnedUsesPolicies::default()
            }
        };

        let known_vulnerable_actions = raw
            .rule_config::<KnownVulnerableActionsConfig>(KnownVulnerableActions::ident())?
            .unwrap_or_default();

        let self_hosted_runner = raw
            .rule_config::<SelfHostedRunnerConfig>(SelfHostedRunner::ident())?
            .unwrap_or_default();

        Ok(Self {
            raw,
            dependabot_cooldown,
            forbidden_uses,
            secrets_outside_env_policy,
            unpinned_uses_policies,
            known_vulnerable_actions,
            self_hosted_runner,
        })
    }

    pub(crate) fn disables(&self, ident: &str) -> bool {
        self.raw
            .rules
            .get(ident)
            .is_some_and(|rule_config| rule_config.disable)
    }

    pub(crate) fn ignores(&self, finding: &Finding<'_>) -> bool {
        let Some(rule_config) = self.raw.rules.get(finding.ident) else {
            return false;
        };

        let ignores = &rule_config.ignore;

        for loc in &finding.locations {
            for rule in ignores
                .iter()
                .filter(|i| i.filename == loc.symbolic.key.filename())
            {
                match rule {
                    WorkflowRule {
                        line: Some(line),
                        column,
                        ..
                    } => {
                        if *line == loc.concrete.location.start_point.row + 1
                            && column.is_none_or(|col| {
                                col == loc.concrete.location.start_point.column + 1
                            })
                        {
                            return true;
                        }
                    }

                    WorkflowRule {
                        line: None,
                        column: None,
                        ..
                    } => return true,
                    _ => unreachable!(),
                }
            }
        }

        false
    }

    pub(crate) fn severity_remap(&self, finding: &Finding<'_>) -> Option<Severity> {
        self.raw
            .rules
            .get(finding.ident)
            .and_then(|rule_config| rule_config.remap.as_ref())
            .and_then(|remap| remap.severity)
            .map(Into::into)
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr as _;

    use super::WorkflowRule;

    #[test]
    fn test_parse_workflow_rule() -> anyhow::Result<()> {
        assert_eq!(
            WorkflowRule::from_str("foo.yml:1:2")?,
            WorkflowRule {
                filename: "foo.yml".into(),
                line: Some(1),
                column: Some(2)
            }
        );

        assert_eq!(
            WorkflowRule::from_str("foo.yml:123")?,
            WorkflowRule {
                filename: "foo.yml".into(),
                line: Some(123),
                column: None
            }
        );

        assert!(WorkflowRule::from_str("foo.yml:0:0").is_err());
        assert!(WorkflowRule::from_str("foo.yml:1:0").is_err());
        assert!(WorkflowRule::from_str("foo.yml:0:1").is_err());
        assert!(WorkflowRule::from_str("foo.yml:123:").is_err());
        assert!(WorkflowRule::from_str("foo.yml::").is_err());
        assert!(WorkflowRule::from_str("foo.yml::1").is_err());
        assert!(WorkflowRule::from_str("foo::1").is_err());
        assert!(WorkflowRule::from_str("foo.unrelated::1").is_err());

        assert!(WorkflowRule::from_str("::1").is_err());
        assert!(WorkflowRule::from_str(":1:1").is_err());
        assert!(WorkflowRule::from_str("1:1").is_err());

        Ok(())
    }
}

use indexmap::IndexMap;

use crate::features::audit_workflow::{
    audit::{self, Audit, AuditLoadError},
    config::Config,
    finding::{Confidence, Finding, Persona, Severity},
    state::AuditState,
};

pub(crate) mod input;

pub(crate) struct AuditRegistry {
    pub(crate) audits: IndexMap<&'static str, Box<dyn Audit + Send + Sync>>,
}

impl AuditRegistry {
    fn empty() -> Self {
        Self {
            audits: IndexMap::default(),
        }
    }

    pub(crate) fn default_audits(audit_state: &AuditState) -> Self {
        let mut registry = Self::empty();

        macro_rules! register_audit {
            ($rule:path) => {{
                use $rule as base;

                use crate::features::audit_workflow::audit::AuditCore as _;
                match base::new(&audit_state) {
                    Ok(audit) => registry.register_audit(base::ident(), Box::new(audit)),
                    Err(AuditLoadError::Skip(e)) => {
                        tracing::debug!("skipping {audit}: {e}", audit = base::ident())
                    }
                }
            }};
        }

        register_audit!(audit::artipacked::Artipacked);
        register_audit!(audit::unsound_contains::UnsoundContains);
        register_audit!(audit::unsound_ternary::UnsoundTernary);
        register_audit!(audit::excessive_permissions::ExcessivePermissions);
        register_audit!(audit::dangerous_triggers::DangerousTriggers);
        register_audit!(audit::impostor_commit::ImpostorCommit);
        register_audit!(audit::ref_confusion::RefConfusion);
        register_audit!(audit::use_trusted_publishing::UseTrustedPublishing);
        register_audit!(audit::template_injection::TemplateInjection);
        register_audit!(audit::hardcoded_container_credentials::HardcodedContainerCredentials);
        register_audit!(audit::self_hosted_runner::SelfHostedRunner);
        register_audit!(audit::known_vulnerable_actions::KnownVulnerableActions);
        register_audit!(audit::unpinned_uses::UnpinnedUses);
        register_audit!(audit::undocumented_permissions::UndocumentedPermissions);
        register_audit!(audit::insecure_commands::InsecureCommands);
        register_audit!(audit::github_env::GitHubEnv);
        register_audit!(audit::cache_poisoning::CachePoisoning);
        register_audit!(audit::secrets_inherit::SecretsInherit);
        register_audit!(audit::bot_conditions::BotConditions);
        register_audit!(audit::overprovisioned_secrets::OverprovisionedSecrets);
        register_audit!(audit::unredacted_secrets::UnredactedSecrets);
        register_audit!(audit::forbidden_uses::ForbiddenUses);
        register_audit!(audit::obfuscation::Obfuscation);
        register_audit!(audit::stale_action_refs::StaleActionRefs);
        register_audit!(audit::unpinned_images::UnpinnedImages);
        register_audit!(audit::anonymous_definition::AnonymousDefinition);
        register_audit!(audit::unsound_condition::UnsoundCondition);
        register_audit!(audit::ref_version_mismatch::RefVersionMismatch);
        register_audit!(audit::dependabot_execution::DependabotExecution);
        register_audit!(audit::dependabot_cooldown::DependabotCooldown);
        register_audit!(audit::concurrency_limits::ConcurrencyLimits);
        register_audit!(audit::archived_uses::ArchivedUses);
        register_audit!(audit::typosquat_uses::TyposquatUses);
        register_audit!(audit::misfeature::Misfeature);
        register_audit!(audit::secrets_outside_env::SecretsOutsideEnvironment);
        register_audit!(audit::superfluous_actions::SuperfluousActions);
        register_audit!(audit::github_app::GitHubApp);
        register_audit!(audit::unpinned_tools::UnpinnedTools);
        register_audit!(audit::adhoc_packages::AdhocPackages);
        register_audit!(audit::insecure_url_scheme::InsecureURLScheme);
        register_audit!(audit::self_repository::SelfRepository);

        registry
    }

    pub(crate) fn register_audit(
        &mut self,
        ident: &'static str,
        audit: Box<dyn Audit + Send + Sync>,
    ) {
        self.audits.insert(ident, audit);
    }

    pub(crate) fn iter_audits(
        &self,
    ) -> indexmap::map::Iter<'_, &'static str, Box<dyn Audit + Send + Sync>> {
        self.audits.iter()
    }
}

impl std::fmt::Debug for AuditRegistry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AuditRegistry")
            .field("audits", &self.audits.len())
            .finish()
    }
}

pub(crate) struct FindingRegistry<'a> {
    config: &'a Config,
    minimum_severity: Option<Severity>,
    minimum_confidence: Option<Confidence>,
    persona: Persona,
    findings: Vec<Finding<'a>>,
}

impl<'a> FindingRegistry<'a> {
    pub(crate) fn new(
        config: &'a Config,
        minimum_severity: Option<Severity>,
        minimum_confidence: Option<Confidence>,
        persona: Persona,
    ) -> Self {
        Self {
            config,
            minimum_severity,
            minimum_confidence,
            persona,
            findings: Vec::new(),
        }
    }

    pub(crate) fn extend(&mut self, results: Vec<Finding<'a>>) {
        for mut finding in results {
            finding.determinations.severity = self
                .config
                .severity_remap(&finding)
                .unwrap_or(finding.determinations.severity);

            let hidden = self.persona > finding.determinations.persona
                || finding.ignored
                || self.config.ignores(&finding)
                || self
                    .minimum_severity
                    .is_some_and(|min| min > finding.determinations.severity)
                || self
                    .minimum_confidence
                    .is_some_and(|min| min > finding.determinations.confidence);

            if !hidden {
                self.findings.push(finding);
            }
        }
    }

    pub(crate) fn into_findings(self) -> Vec<Finding<'a>> {
        self.findings
    }
}

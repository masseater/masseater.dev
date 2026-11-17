use std::{collections::HashSet, sync::LazyLock};

use github_actions_models::common::{EnvValue, RepositoryUses, Uses, expr::LoE};
use indexmap::IndexMap;
use subfeature::Subfeature;

use crate::features::audit_workflow::{
    audit::{Audit, AuditError, AuditLoadError, audit_meta},
    finding::{Confidence, Finding, Persona, Severity},
    models::{
        StepBodyCommon, StepCommon, action::CompositeStep, uses::RepositoryUsesExt as _,
        workflow::Step,
    },
    state::AuditState,
    utils::ExtractedExpr,
};

static ORG_ONLY_PERMISSIONS: LazyLock<HashSet<&str>> = LazyLock::new(|| {
    [
        "permission-custom-properties-for-organizations",
        "permission-enterprise-custom-properties-for-organizations",
        "permission-members",
        "permission-organization-administration",
        "permission-organization-announcement-banners",
        "permission-organization-copilot-seat-management",
        "permission-organization-custom-org-roles",
        "permission-organization-custom-properties",
        "permission-organization-custom-roles",
        "permission-organization-events",
        "permission-organization-hooks",
        "permission-organization-packages",
        "permission-organization-personal-access-token-requests",
        "permission-organization-personal-access-tokens",
        "permission-organization-plan",
        "permission-organization-projects",
        "permission-organization-secrets",
        "permission-organization-self-hosted-runners",
        "permission-organization-user-blocking",
    ]
    .into_iter()
    .collect()
});

pub(crate) struct GitHubApp;

audit_meta!(
    GitHubApp,
    "github-app",
    "dangerous use of GitHub App tokens"
);

impl GitHubApp {
    fn permissions_are_org_only(permissions: &HashSet<&str>) -> bool {
        if permissions.is_empty() {
            return false;
        }

        permissions.is_subset(&ORG_ONLY_PERMISSIONS)
    }

    fn process_step<'doc>(step: &impl StepCommon<'doc>) -> Result<Vec<Finding<'doc>>, AuditError> {
        let Some(StepBodyCommon::Uses {
            uses: Uses::Repository(uses),
            with,
        }) = step.body()
        else {
            return Ok(vec![]);
        };

        let findings = if uses.matches("actions/create-github-app-token") {
            Self::process_create_github_app_token(step, uses, with)?
        } else {
            vec![]
        };

        Ok(findings)
    }

    fn process_create_github_app_token<'doc>(
        step: &impl StepCommon<'doc>,
        uses: &'doc RepositoryUses,
        with: &'doc LoE<IndexMap<String, EnvValue>>,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut findings = vec![];

        let LoE::Literal(with) = with else {
            tracing::debug!("skipping analysis of non-literal `with` for create-github-app-token");
            return Ok(findings);
        };

        let revocation = with.get("skip-token-revoke").and_then(|skip_token_revoke| {
            match skip_token_revoke.actions_toolkit_bool() {
                Some(true) => Some((Confidence::High, "token revocation disabled here")),
                Some(false) => None,
                None => match skip_token_revoke {
                    EnvValue::String(value) if ExtractedExpr::from_fenced(value).is_some() => {
                        Some((
                            Confidence::Low,
                            "token revocation conditionally disabled here",
                        ))
                    }
                    _ => None,
                },
            }
        });
        if let Some((confidence, annotation)) = revocation {
            findings.push(
                Self::finding()
                    .confidence(confidence)
                    .severity(Severity::High)
                    .persona(Persona::Regular)
                    .add_location(
                        step.location()
                            .with_keys(["uses".into()])
                            .subfeature(Subfeature::new(0, uses.raw()))
                            .annotated("app token requested here"),
                    )
                    .add_location(
                        step.location()
                            .with_keys(["with".into(), "skip-token-revoke".into()])
                            .annotated(annotation)
                            .primary(),
                    )
                    .build(step)?,
            );
        }

        let permissions: HashSet<&str> = with
            .keys()
            .map(std::string::String::as_str)
            .filter(|k| k.starts_with("permission-"))
            .collect();

        tracing::trace!("permissions: {permissions:?}");

        if with.contains_key("owner")
            && !with.contains_key("repositories")
            && !Self::permissions_are_org_only(&permissions)
        {
            findings.push(
                Self::finding()
                    .confidence(Confidence::High)
                    .severity(Severity::High)
                    .persona(Persona::Regular)
                    .add_location(
                        step.location()
                            .with_keys(["uses".into()])
                            .subfeature(Subfeature::new(0, uses.raw()))
                            .annotated("app token requested here"),
                    )
                    .add_location(
                        step.location()
                            .with_keys(["with".into(), "owner".into()])
                            .annotated("token granted access to all repositories for this owner's app installation")
                            .primary(),
                    )
                    .tip("use `repositories: 'repo1,repo2'` to scope the token to specific repositories")
                    .build(step)?,
            );
        }

        if !with.keys().any(|k| k.starts_with("permission-")) {
            findings.push(
                Self::finding()
                    .confidence(Confidence::High)
                    .severity(Severity::High)
                    .persona(Persona::Regular)
                    .add_location(
                        step.location()
                            .with_keys(["uses".into()])
                            .subfeature(Subfeature::new(0, uses.raw()))
                            .annotated("app token inherits blanket installation permissions"),
                    )
                    .tip("specify at least one `permission-<name>` input to limit the token's permissions")
                    .build(step)?,
            );
        }

        Ok(findings)
    }
}

impl Audit for GitHubApp {
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

    fn audit_composite_step<'doc>(
        &self,
        step: &CompositeStep<'doc>,
        _group: &crate::features::audit_workflow::registry::input::InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Self::process_step(step)
    }
}

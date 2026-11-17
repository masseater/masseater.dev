use thiserror::Error;
use tracing::instrument;
use yamlpath::Document;

use crate::features::audit_workflow::{
    finding::{
        Finding, FindingBuilder,
        location::{Routable, SymbolicLocation},
    },
    models::{
        AsDocument,
        action::{Action, CompositeStep, DockerAction},
        dependabot::Dependabot,
        pre_commit::{self, PreCommitConfig, PreCommitHooks},
        workflow::{Job, NormalJob, ReusableWorkflowCallJob, Step, Workflow},
    },
    registry::input::{InputGroup, InputKey},
    state::AuditState,
};

pub(crate) mod adhoc_packages;
pub(crate) mod anonymous_definition;
pub(crate) mod archived_uses;
pub(crate) mod artipacked;
pub(crate) mod bot_conditions;
pub(crate) mod cache_poisoning;
pub(crate) mod concurrency_limits;
pub(crate) mod dangerous_triggers;
pub(crate) mod dependabot_cooldown;
pub(crate) mod dependabot_execution;
pub(crate) mod excessive_permissions;
pub(crate) mod forbidden_uses;
pub(crate) mod github_app;
pub(crate) mod github_env;
pub(crate) mod hardcoded_container_credentials;
pub(crate) mod impostor_commit;
pub(crate) mod insecure_commands;
pub(crate) mod insecure_url_scheme;
pub(crate) mod known_vulnerable_actions;
pub(crate) mod misfeature;
pub(crate) mod obfuscation;
pub(crate) mod overprovisioned_secrets;
pub(crate) mod ref_confusion;
pub(crate) mod ref_version_mismatch;
pub(crate) mod secrets_inherit;
pub(crate) mod secrets_outside_env;
pub(crate) mod self_hosted_runner;
pub(crate) mod self_repository;
pub(crate) mod stale_action_refs;
pub(crate) mod superfluous_actions;
pub(crate) mod template_injection;
pub(crate) mod typosquat_uses;
pub(crate) mod undocumented_permissions;
pub(crate) mod unpinned_images;
pub(crate) mod unpinned_tools;
pub(crate) mod unpinned_uses;
pub(crate) mod unredacted_secrets;
pub(crate) mod unsound_condition;
pub(crate) mod unsound_contains;
pub(crate) mod unsound_ternary;
pub(crate) mod use_trusted_publishing;

#[derive(Debug)]
pub(crate) enum AuditInput {
    Workflow(Workflow),
    Action(Action),
    Dependabot(Dependabot),
    PreCommitConfig(PreCommitConfig),
    PreCommitHooks(PreCommitHooks),
}

impl AuditInput {
    pub(crate) fn key(&self) -> &InputKey {
        match self {
            Self::Workflow(workflow) => &workflow.key,
            Self::Action(action) => &action.key,
            Self::Dependabot(dependabot) => &dependabot.key,
            Self::PreCommitConfig(pre_commit_config) => &pre_commit_config.key,
            Self::PreCommitHooks(pre_commit_hooks) => &pre_commit_hooks.key,
        }
    }

    pub(crate) fn location(&self) -> SymbolicLocation<'_> {
        match self {
            Self::Workflow(workflow) => workflow.location(),
            Self::Action(action) => action.location(),
            Self::Dependabot(dependabot) => dependabot.location(),
            Self::PreCommitConfig(pre_commit_config) => pre_commit_config.location(),
            Self::PreCommitHooks(pre_commit_hooks) => pre_commit_hooks.location(),
        }
    }

    pub(crate) fn supports_gha_template_syntax(&self) -> bool {
        matches!(self, Self::Workflow(_) | Self::Action(_))
    }
}

impl<'a> AsDocument<'a, 'a> for AuditInput {
    fn as_document(&'a self) -> &'a Document {
        match self {
            Self::Workflow(workflow) => workflow.as_document(),
            Self::Action(action) => action.as_document(),
            Self::Dependabot(dependabot) => dependabot.as_document(),
            Self::PreCommitConfig(pre_commit_config) => pre_commit_config.as_document(),
            Self::PreCommitHooks(pre_commit_hooks) => pre_commit_hooks.as_document(),
        }
    }
}

impl<'a> Routable<'a, 'a> for AuditInput {
    fn route(&'a self) -> yamlpath::Route<'a> {
        match self {
            Self::Workflow(workflow) => workflow.location().route,
            Self::Action(action) => action.location().route,
            Self::Dependabot(dependabot) => dependabot.location().route,
            Self::PreCommitConfig(pre_commit_config) => pre_commit_config.location().route,
            Self::PreCommitHooks(pre_commit_hooks) => pre_commit_hooks.location().route,
        }
    }
}

impl From<Workflow> for AuditInput {
    fn from(value: Workflow) -> Self {
        Self::Workflow(value)
    }
}

impl From<Action> for AuditInput {
    fn from(value: Action) -> Self {
        Self::Action(value)
    }
}

impl From<Dependabot> for AuditInput {
    fn from(value: Dependabot) -> Self {
        Self::Dependabot(value)
    }
}

impl From<PreCommitConfig> for AuditInput {
    fn from(value: PreCommitConfig) -> Self {
        Self::PreCommitConfig(value)
    }
}

impl From<PreCommitHooks> for AuditInput {
    fn from(value: PreCommitHooks) -> Self {
        Self::PreCommitHooks(value)
    }
}

pub(crate) trait AuditCore {
    fn ident() -> &'static str
    where
        Self: Sized;

    fn desc() -> &'static str
    where
        Self: Sized;

    fn url() -> &'static str
    where
        Self: Sized;

    fn finding<'doc>() -> FindingBuilder<'doc>
    where
        Self: Sized,
    {
        FindingBuilder::new(Self::ident(), Self::desc(), Self::url())
    }

    fn err(error: impl Into<anyhow::Error>) -> AuditError
    where
        Self: Sized,
    {
        AuditError {
            ident: Self::ident(),
            source: error.into(),
        }
    }
}

macro_rules! audit_meta {
    ($t:ty, $id:literal, $desc:expr_2021) => {
        use crate::features::audit_workflow::audit::AuditCore;

        impl AuditCore for $t {
            fn ident() -> &'static str {
                $id
            }

            fn desc() -> &'static str
            where
                Self: Sized,
            {
                $desc
            }

            fn url() -> &'static str {
                concat!("https://docs.zizmor.sh/audits/#", $id)
            }
        }
    };
}

pub(crate) use audit_meta;

#[derive(Error, Debug)]
pub(crate) enum AuditLoadError {
    #[error("{0}")]
    Skip(anyhow::Error),
}

#[derive(Error, Debug)]
#[error("error in '{ident}' audit")]
pub(crate) struct AuditError {
    ident: &'static str,
    source: anyhow::Error,
}

impl AuditError {
    pub(crate) fn new(ident: &'static str, error: impl Into<anyhow::Error>) -> Self {
        Self {
            ident,
            source: error.into(),
        }
    }
}

pub(crate) trait Audit: AuditCore {
    fn new(state: &AuditState) -> Result<Self, AuditLoadError>
    where
        Self: Sized;

    fn audit_step<'doc>(
        &self,
        _step: &Step<'doc>,
        _group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Ok(vec![])
    }

    fn audit_normal_job<'doc>(
        &self,
        job: &NormalJob<'doc>,
        group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut results = vec![];
        for step in job.steps() {
            results.extend(self.audit_step(&step, group)?);
        }
        Ok(results)
    }

    fn audit_reusable_job<'doc>(
        &self,
        _job: &ReusableWorkflowCallJob<'doc>,
        _group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Ok(vec![])
    }

    fn audit_workflow<'doc>(
        &self,
        workflow: &'doc Workflow,
        group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut results = vec![];

        for job in workflow.jobs() {
            match job {
                Job::NormalJob(normal) => {
                    results.extend(self.audit_normal_job(&normal, group)?);
                }
                Job::ReusableWorkflowCallJob(reusable) => {
                    results.extend(self.audit_reusable_job(&reusable, group)?);
                }
            }
        }

        Ok(results)
    }

    fn audit_docker_action<'doc>(
        &self,
        _docker: &DockerAction<'doc>,
        _group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Ok(vec![])
    }

    fn audit_composite_step<'doc>(
        &self,
        _step: &CompositeStep<'doc>,
        _group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Ok(vec![])
    }

    fn audit_action<'doc>(
        &self,
        action: &'doc Action,
        group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut results = vec![];

        if let Some(docker) = action.docker() {
            results.extend(self.audit_docker_action(&docker, group)?);
        }

        if let Some(steps) = action.steps() {
            for step in steps {
                results.extend(self.audit_composite_step(&step, group)?);
            }
        }

        Ok(results)
    }

    fn audit_dependabot<'doc>(
        &self,
        _dependabot: &'doc Dependabot,
        _group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Ok(vec![])
    }

    fn audit_pre_commit_config_repo<'doc>(
        &self,
        _repo: &pre_commit::Repo<'doc>,
        _group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Ok(vec![])
    }

    fn audit_pre_commit_config<'doc>(
        &self,
        pre_commit: &'doc PreCommitConfig,
        group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        let mut results = vec![];

        for repo in pre_commit.repos() {
            results.extend(self.audit_pre_commit_config_repo(&repo, group)?);
        }

        Ok(results)
    }

    fn audit_pre_commit_hooks<'doc>(
        &self,
        _hooks: &'doc PreCommitHooks,
        _group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Ok(vec![])
    }

    fn audit_raw<'doc>(
        &self,
        _input: &'doc AuditInput,
        _group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        Ok(vec![])
    }

    #[instrument(skip(self, group))]
    fn audit<'doc>(
        &self,
        ident: &'static str,
        input: &'doc AuditInput,
        group: &InputGroup,
    ) -> Result<Vec<Finding<'doc>>, AuditError> {
        if group.config().disables(ident) {
            return Ok(vec![]);
        }

        let mut results = match input {
            AuditInput::Workflow(workflow) => self.audit_workflow(workflow, group),
            AuditInput::Action(action) => self.audit_action(action, group),
            AuditInput::Dependabot(dependabot) => self.audit_dependabot(dependabot, group),
            AuditInput::PreCommitConfig(pre_commit) => {
                self.audit_pre_commit_config(pre_commit, group)
            }
            AuditInput::PreCommitHooks(hooks) => self.audit_pre_commit_hooks(hooks, group),
        }?;

        results.extend(self.audit_raw(input, group)?);

        Ok(results)
    }
}

use github_actions_expressions::context::{self};
use github_actions_models::{
    common::{self, CacheMode, expr::LoE},
    workflow::{
        self, TriggerSyntax,
        event::{BareEvent, OptionalBody},
        job,
    },
};
use std::collections::HashSet;

pub(crate) mod cache_mode;
pub(crate) mod matrix;
pub(crate) mod runners;

use crate::features::audit_workflow::models::workflow::runners::{JobRunners, Runner};
use crate::features::audit_workflow::{
    finding::location::{Locatable, SymbolicFeature, SymbolicLocation},
    models::{
        AsDocument, StepBodyCommon, StepCommon, Validatable,
        inputs::{Capability, HasInputs},
        workflow::matrix::Matrix,
    },
    registry::input::CollectionError,
    registry::input::InputKey,
    utils::{self, once::warn_once},
};

pub(crate) struct Workflow {
    pub(crate) key: InputKey,

    document: yamlpath::Document,
    inner: workflow::Workflow,
}

impl Validatable<'_> for Workflow {
    type Target = workflow::Workflow;

    type Skeleton = yaml_serde::Mapping;
}

impl<'a> AsDocument<'a, 'a> for Workflow {
    fn as_document(&'a self) -> &'a yamlpath::Document {
        &self.document
    }
}

impl std::fmt::Debug for Workflow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{key}", key = self.key)
    }
}

impl std::ops::Deref for Workflow {
    type Target = workflow::Workflow;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl HasInputs for workflow::event::WorkflowCall {
    fn get_input(&self, name: &str) -> Option<Capability> {
        let input = self.inputs.get(name)?;

        Some(match input.r#type {
            workflow::event::WorkflowCallInputType::Boolean
            | workflow::event::WorkflowCallInputType::Number => Capability::Fixed,
            workflow::event::WorkflowCallInputType::String => Capability::Arbitrary,
        })
    }
}

impl HasInputs for workflow::event::WorkflowDispatch {
    fn get_input(&self, name: &str) -> Option<Capability> {
        let input = self.inputs.get(name)?;

        Some(match input.r#type {
            workflow::event::WorkflowDispatchInputType::Boolean
            | workflow::event::WorkflowDispatchInputType::Choice
            | workflow::event::WorkflowDispatchInputType::Environment
            | workflow::event::WorkflowDispatchInputType::Number => Capability::Fixed,
            workflow::event::WorkflowDispatchInputType::String => Capability::Arbitrary,
        })
    }
}

impl HasInputs for Workflow {
    fn get_input(&self, name: &str) -> Option<Capability> {
        let events = &self.on.events;

        let wc_cap = {
            if let OptionalBody::Body(wc) = &events.workflow_call {
                wc.get_input(name)
            } else {
                None
            }
        };

        let wd_cap = {
            if let OptionalBody::Body(wd) = &events.workflow_dispatch {
                wd.get_input(name)
            } else {
                None
            }
        };

        match (wc_cap, wd_cap) {
            (Some(cap1), Some(cap2)) => Some(cap1.unify(cap2)),
            (Some(single), None) | (None, Some(single)) => Some(single),
            (None, None) => None,
        }
    }
}

impl Workflow {
    pub(crate) fn from_string(contents: &str, key: InputKey) -> Result<Self, CollectionError> {
        let inner = Self::validate(contents)?;

        let document = yamlpath::Document::new(contents)?;

        Ok(Self {
            key,
            document,
            inner,
        })
    }

    pub(crate) fn jobs(&self) -> Jobs<'_> {
        Jobs::new(self)
    }

    fn trigger_location(&self, event: &BareEvent) -> SymbolicLocation<'_> {
        let parent = self.location().with_keys(["on".into()]);

        match &self.on.syntax {
            TriggerSyntax::Mapping => parent.with_keys([event.as_str().into()]).key_only(),
            TriggerSyntax::Scalar => parent,
            TriggerSyntax::Sequence(events) => {
                let idx = events
                    .iter()
                    .position(|candidate| candidate == event)
                    .expect("present event must appear in the source sequence");
                parent.with_keys([idx.into()])
            }
        }
    }

    pub(crate) fn issue_comment(&self) -> Option<SymbolicLocation<'_>> {
        self.on
            .events
            .issue_comment
            .is_present()
            .then(|| self.trigger_location(&BareEvent::IssueComment))
    }

    pub(crate) fn pull_request_target(&self) -> Option<SymbolicLocation<'_>> {
        self.on
            .events
            .pull_request_target
            .is_present()
            .then(|| self.trigger_location(&BareEvent::PullRequestTarget))
    }

    pub(crate) fn workflow_run(&self) -> Option<SymbolicLocation<'_>> {
        self.on
            .events
            .workflow_run
            .is_present()
            .then(|| self.trigger_location(&BareEvent::WorkflowRun))
    }

    pub(crate) fn workflow_call(&self) -> Option<SymbolicLocation<'_>> {
        self.on
            .events
            .workflow_call
            .is_present()
            .then(|| self.trigger_location(&BareEvent::WorkflowCall))
    }

    pub(crate) fn has_single_trigger(&self) -> bool {
        self.on.events.count() == 1
    }

    pub(crate) fn is_reusable_only(&self) -> bool {
        self.workflow_call().is_some() && self.has_single_trigger()
    }

    pub(crate) fn location(&self) -> SymbolicLocation<'_> {
        SymbolicLocation {
            key: &self.key,
            link: None,
            annotation: "this workflow".into(),
            route: yamlpath::Route::default(),
            feature_kind: SymbolicFeature::Normal,
            kind: crate::features::audit_workflow::finding::location::LocationKind::default(),
        }
    }
}

#[derive(Clone)]
pub(crate) struct NormalJob<'doc> {
    id: &'doc str,

    inner: &'doc job::NormalJob,

    parent: &'doc Workflow,
}

impl<'doc> NormalJob<'doc> {
    pub(crate) fn new(id: &'doc str, inner: &'doc job::NormalJob, parent: &'doc Workflow) -> Self {
        Self { id, inner, parent }
    }

    pub(crate) fn matrix(&self) -> Option<Matrix<'doc>> {
        Matrix::new(self)
    }

    pub(crate) fn steps(&self) -> Steps<'doc> {
        Steps::new(self)
    }

    pub(crate) fn has_id_token(&self) -> bool {
        let effective_permissions = match self.permissions {
            common::Permissions::Base(common::BasePermission::Default) => &self.parent.permissions,
            _ => &self.permissions,
        };

        match effective_permissions {
            common::Permissions::Base(common::BasePermission::WriteAll) => true,
            common::Permissions::Explicit(explicit) => explicit
                .get("id-token")
                .is_some_and(|perm| matches!(perm, common::Permission::Write)),
            common::Permissions::Base(_) => false,
        }
    }

    pub(crate) fn runner_default_shell(&self) -> Option<&'static str> {
        match &self.runs_on {
            LoE::Expr(_) => None,
            LoE::Literal(job::RunsOn::Group { group: _, labels } | job::RunsOn::Target(labels)) => {
                for label in labels {
                    match label.as_str() {
                        "linux" | "macOS" => return Some("bash"),
                        "windows" => return Some("pwsh"),

                        l if l.contains("ubuntu-") || l.contains("macos") => return Some("bash"),
                        l if l.contains("windows-") => return Some("pwsh"),
                        _ => {}
                    }
                }

                None
            }
        }
    }

    pub(crate) fn conditions(
        &self,
    ) -> impl Iterator<Item = (&'doc common::If, SymbolicLocation<'doc>)> {
        self.r#if.iter().map(|cond| (cond, self.location())).chain(
            self.steps()
                .filter_map(|step| step.r#if().map(|cond| (cond, step.location()))),
        )
    }

    pub(crate) fn runners(
        &self,
        included_runners: &HashSet<String>,
        excluded_groups: &HashSet<String>,
    ) -> impl Iterator<Item = Runner<'doc>> {
        JobRunners::new(self, included_runners, excluded_groups).iter()
    }
}

impl<'a, 'doc> AsDocument<'a, 'doc> for NormalJob<'doc> {
    fn as_document(&'a self) -> &'doc yamlpath::Document {
        self.parent.as_document()
    }
}

impl<'doc> JobCommon<'doc> for NormalJob<'doc> {
    fn id(&self) -> &'doc str {
        self.id
    }

    fn name(&self) -> Option<&'doc str> {
        self.inner.name.as_deref()
    }

    fn parent(&self) -> &'doc Workflow {
        self.parent
    }

    fn cache_mode(&self) -> Option<CacheMode> {
        self.cache_mode
    }
}

impl<'doc> std::ops::Deref for NormalJob<'doc> {
    type Target = &'doc job::NormalJob;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

#[derive(Clone)]
pub(crate) struct ReusableWorkflowCallJob<'doc> {
    id: &'doc str,

    inner: &'doc job::ReusableWorkflowCallJob,

    parent: &'doc Workflow,
}

impl<'doc> ReusableWorkflowCallJob<'doc> {
    pub(crate) fn new(
        id: &'doc str,
        inner: &'doc job::ReusableWorkflowCallJob,
        parent: &'doc Workflow,
    ) -> Self {
        Self { id, inner, parent }
    }
}

impl<'a, 'doc> AsDocument<'a, 'doc> for ReusableWorkflowCallJob<'doc> {
    fn as_document(&'a self) -> &'doc yamlpath::Document {
        self.parent.as_document()
    }
}

impl<'doc> JobCommon<'doc> for ReusableWorkflowCallJob<'doc> {
    fn id(&self) -> &'doc str {
        self.id
    }

    fn name(&self) -> Option<&'doc str> {
        self.inner.name.as_deref()
    }

    fn parent(&self) -> &'doc Workflow {
        self.parent
    }

    fn cache_mode(&self) -> Option<CacheMode> {
        self.cache_mode
    }
}

impl<'doc> std::ops::Deref for ReusableWorkflowCallJob<'doc> {
    type Target = &'doc job::ReusableWorkflowCallJob;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

pub(crate) trait JobCommon<'doc>: Locatable<'doc> {
    fn id(&self) -> &'doc str;

    fn name(&self) -> Option<&'doc str>;

    fn parent(&self) -> &'doc Workflow;

    fn cache_mode(&self) -> Option<CacheMode>;
}

impl<'doc, T: JobCommon<'doc>> Locatable<'doc> for T {
    fn location(&self) -> SymbolicLocation<'doc> {
        self.parent()
            .location()
            .annotated("this job")
            .with_keys(["jobs".into(), self.id().into()])
    }

    fn location_with_grip(&self) -> SymbolicLocation<'doc> {
        if self.name().is_some() {
            self.location().with_keys(["name".into()])
        } else {
            self.parent()
                .location()
                .annotated("this job")
                .with_keys(["jobs".into(), self.id().into()])
                .key_only()
        }
    }
}

#[derive(Clone)]
pub(crate) enum Job<'doc> {
    NormalJob(NormalJob<'doc>),
    ReusableWorkflowCallJob(ReusableWorkflowCallJob<'doc>),
}

impl<'doc> Job<'doc> {
    fn new(id: &'doc str, inner: &'doc workflow::Job, parent: &'doc Workflow) -> Self {
        match inner {
            workflow::Job::NormalJob(normal) => Job::NormalJob(NormalJob::new(id, normal, parent)),
            workflow::Job::ReusableWorkflowCallJob(reusable) => {
                Job::ReusableWorkflowCallJob(ReusableWorkflowCallJob::new(id, reusable, parent))
            }
        }
    }
}

pub(crate) struct Jobs<'doc> {
    parent: &'doc Workflow,
    inner: indexmap::map::Iter<'doc, String, workflow::Job>,
}

impl<'doc> Jobs<'doc> {
    fn new(workflow: &'doc Workflow) -> Self {
        Self {
            parent: workflow,
            inner: workflow.jobs.iter(),
        }
    }
}

impl<'doc> Iterator for Jobs<'doc> {
    type Item = Job<'doc>;

    fn next(&mut self) -> Option<Self::Item> {
        for (id, job) in self.inner.by_ref() {
            let cond = match job {
                workflow::Job::NormalJob(normal) => normal.r#if.as_ref(),
                workflow::Job::ReusableWorkflowCallJob(reusable) => reusable.r#if.as_ref(),
            };

            if let Some(cond) = cond
                && crate::features::audit_workflow::models::if_is_statically_false(cond)
            {
                continue;
            }

            return Some(Job::new(id, job, self.parent));
        }

        None
    }
}

#[derive(Clone)]
pub(crate) struct Step<'doc> {
    steps_index: usize,

    parallel_index: Option<usize>,

    inner: StepInner<'doc>,

    pub(crate) parent: NormalJob<'doc>,
}

impl<'doc> std::ops::Deref for Step<'doc> {
    type Target = StepInner<'doc>;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl AsRef<InputKey> for Step<'_> {
    fn as_ref(&self) -> &InputKey {
        &self.parent.parent.key
    }
}

impl<'doc> Locatable<'doc> for Step<'doc> {
    fn location(&self) -> SymbolicLocation<'doc> {
        if let Some(parallel_index) = self.parallel_index {
            self.job().location().with_keys([
                "steps".into(),
                self.steps_index.into(),
                "parallel".into(),
                parallel_index.into(),
            ])
        } else {
            self.job()
                .location()
                .with_keys(["steps".into(), self.steps_index.into()])
        }
        .annotated("this step")
    }

    fn location_with_grip(&self) -> SymbolicLocation<'doc> {
        if self.name().is_some() {
            self.location().with_keys(["name".into()])
        } else if self.id().is_some() {
            self.location().with_keys(["id".into()])
        } else {
            self.location()
        }
    }
}

impl HasInputs for Step<'_> {
    fn get_input(&self, name: &str) -> Option<Capability> {
        self.workflow().get_input(name)
    }
}

impl<'doc> StepCommon<'doc> for Step<'doc> {
    fn ord(&self) -> impl Ord {
        (self.steps_index, self.parallel_index)
    }

    fn env_is_static(&self, ctx: &context::Context) -> bool {
        utils::env_is_static(ctx, &[self.env(), &self.job().env, &self.workflow().env])
    }

    fn uses(&self) -> Option<&'doc common::Uses> {
        let StepInner::Uses(job::UsesStep { uses, .. }) = &self.inner else {
            return None;
        };

        Some(uses)
    }

    fn matrix(&self) -> Option<Matrix<'doc>> {
        self.job().matrix()
    }

    fn body(&self) -> Option<StepBodyCommon<'doc>> {
        match &self.inner {
            StepInner::Uses(job::UsesStep { uses, with, .. }) => {
                Some(StepBodyCommon::Uses { uses, with })
            }
            StepInner::Run(job::RunStep {
                run,
                working_directory,
                shell,
                ..
            }) => Some(StepBodyCommon::Run {
                run,
                _working_directory: working_directory.as_deref(),
                _shell: shell.as_ref(),
            }),
        }
    }

    fn document(&self) -> &'doc yamlpath::Document {
        self.workflow().as_document()
    }

    fn shell(&self) -> Option<(&str, SymbolicLocation<'doc>)> {
        self.shell()
    }
}

impl<'doc> Step<'doc> {
    fn new(
        steps_index: usize,
        parallel_index: Option<usize>,
        inner: StepInner<'doc>,
        parent: NormalJob<'doc>,
    ) -> Self {
        Self {
            steps_index,
            parallel_index,
            inner,
            parent,
        }
    }

    pub(crate) fn name(&self) -> Option<&'doc str> {
        match self.inner {
            StepInner::Uses(uses) => uses.shared.name.as_deref(),
            StepInner::Run(run) => run.shared.name.as_deref(),
        }
    }

    pub(crate) fn id(&self) -> Option<&'doc str> {
        match self.inner {
            StepInner::Uses(uses) => uses.shared.id.as_deref(),
            StepInner::Run(run) => run.shared.id.as_deref(),
        }
    }

    pub(crate) fn r#if(&self) -> Option<&'doc common::If> {
        match self.inner {
            StepInner::Uses(uses) => uses.shared.r#if.as_ref(),
            StepInner::Run(run) => run.shared.r#if.as_ref(),
        }
    }

    pub(crate) fn env(&self) -> &'doc LoE<common::Env> {
        match self.inner {
            StepInner::Uses(uses) => &uses.shared.env,
            StepInner::Run(run) => &run.shared.env,
        }
    }

    pub(crate) fn job(&self) -> &NormalJob<'doc> {
        &self.parent
    }

    pub(crate) fn workflow(&self) -> &'doc Workflow {
        self.parent.parent()
    }

    pub(crate) fn shell(&self) -> Option<(&str, SymbolicLocation<'doc>)> {
        let StepInner::Run(job::RunStep { shell, .. }) = &self.inner else {
            panic!("API misuse: can't call shell() on a uses: step")
        };

        let shell = match shell {
            Some(LoE::Literal(shell)) => Some((
                shell.as_str(),
                self.location()
                    .with_keys(["shell".into()])
                    .annotated("shell defined here"),
            )),
            Some(LoE::Expr(_)) => return None,
            None => match self
                .job()
                .defaults
                .as_ref()
                .and_then(|d| d.run.as_ref().and_then(|r| r.shell.as_ref()))
            {
                Some(LoE::Literal(shell)) => Some((
                    shell.as_str(),
                    self.job()
                        .location()
                        .with_keys(["defaults".into(), "run".into(), "shell".into()])
                        .annotated("job default shell defined here"),
                )),
                Some(LoE::Expr(_)) => return None,
                None => match self
                    .workflow()
                    .defaults
                    .as_ref()
                    .and_then(|d| d.run.as_ref().and_then(|r| r.shell.as_ref()))
                {
                    Some(LoE::Literal(shell)) => Some((
                        shell.as_str(),
                        self.workflow()
                            .location()
                            .with_keys(["defaults".into(), "run".into(), "shell".into()])
                            .annotated("workflow default shell defined here"),
                    )),
                    Some(LoE::Expr(_)) => return None,
                    None => None,
                },
            },
        };

        shell.or_else(|| {
            self.parent.runner_default_shell().map(|shell| {
                (
                    shell,
                    self.job()
                        .location()
                        .with_keys(["runs-on".into()])
                        .annotated("shell implied by runner"),
                )
            })
        })
    }
}

#[derive(Clone)]
pub(crate) enum StepInner<'doc> {
    Uses(&'doc job::UsesStep),
    Run(&'doc job::RunStep),
}

pub(crate) struct Steps<'doc> {
    outer: std::iter::Enumerate<std::slice::Iter<'doc, job::Step>>,

    parallel: Option<(
        usize,
        std::iter::Enumerate<std::slice::Iter<'doc, job::ParallelStep>>,
    )>,
    parent: NormalJob<'doc>,
}

impl<'doc> Steps<'doc> {
    fn new(job: &NormalJob<'doc>) -> Self {
        Self {
            outer: job.steps.iter().enumerate(),
            parallel: None,
            parent: job.clone(),
        }
    }

    fn next_raw(&mut self) -> Option<(usize, Option<usize>, StepInner<'doc>)> {
        loop {
            if let Some((step_idx, par_iter)) = self.parallel.as_mut() {
                if let Some((par_idx, step)) = par_iter.next() {
                    let step = match step {
                        job::ParallelStep::Uses(uses) => StepInner::Uses(uses),
                        job::ParallelStep::Run(run) => StepInner::Run(run),
                    };

                    return Some((*step_idx, Some(par_idx), step));
                }
                self.parallel = None;
            }

            let (step_idx, step) = self.outer.next()?;
            match &step {
                job::Step::Uses(uses) => return Some((step_idx, None, StepInner::Uses(uses))),
                job::Step::Run(run) => return Some((step_idx, None, StepInner::Run(run))),
                job::Step::Wait { .. } | job::Step::WaitAll { .. } | job::Step::Cancel { .. } => {}
                job::Step::Parallel {
                    parallel: parallel_steps,
                    ..
                } => {
                    warn_once!(
                        "one or more inputs contains parallel steps; zizmor's support \
                        for these is currently experimental. see \
                        https://docs.zizmor.sh/usage/#parallel-step for details"
                    );

                    self.parallel = Some((step_idx, parallel_steps.iter().enumerate()));
                }
            }
        }
    }
}

impl<'doc> Iterator for Steps<'doc> {
    type Item = Step<'doc>;

    fn next(&mut self) -> Option<Self::Item> {
        while let Some((step_idx, par_idx, step)) = self.next_raw() {
            let r#if = match step {
                StepInner::Uses(uses) => uses.shared.r#if.as_ref(),
                StepInner::Run(run) => run.shared.r#if.as_ref(),
            };

            if let Some(cond) = r#if
                && crate::features::audit_workflow::models::if_is_statically_false(cond)
            {
                continue;
            }
            return Some(Step::new(step_idx, par_idx, step, self.parent.clone()));
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use crate::features::audit_workflow::models::{
        inputs::{Capability, HasInputs as _},
        workflow::Workflow,
    };

    #[test]
    fn test_workflow_has_inputs() -> anyhow::Result<()> {
        let workflow = r"
name: Test Workflow
on:
  workflow_dispatch:
    inputs:
      foo:
        type: string
        required: true
      bar:
        type: boolean
        required: false
  workflow_call:
    inputs:
      foo:
        type: number
        required: true
      bar:
        type: boolean
        required: false

jobs:
  test_job:
    runs-on: ubuntu-latest
    steps:
      - run: true
";

        let workflow = Workflow::from_string(
            workflow,
            crate::features::audit_workflow::registry::input::InputKey::local("dummy", None),
        )?;

        let foo_cap = workflow.get_input("foo").unwrap();
        assert_eq!(foo_cap, Capability::Arbitrary);

        let bar_cap = workflow.get_input("bar").unwrap();
        assert_eq!(bar_cap, Capability::Fixed);

        Ok(())
    }
}

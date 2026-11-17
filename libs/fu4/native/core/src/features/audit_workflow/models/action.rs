use github_actions_expressions::context;
use github_actions_models::{
    action,
    common::{self, expr::LoE},
};

use crate::features::audit_workflow::{
    finding::location::{Locatable, SymbolicFeature, SymbolicLocation},
    models::{
        AsDocument, StepBodyCommon, StepCommon, Validatable,
        inputs::{Capability, HasInputs},
        workflow::matrix::Matrix,
    },
    registry::input::CollectionError,
    registry::input::InputKey,
    utils,
};

pub(crate) struct Action {
    pub(crate) key: InputKey,
    document: yamlpath::Document,
    inner: action::Action,
}

impl Validatable<'_> for Action {
    type Target = action::Action;

    type Skeleton = yaml_serde::Mapping;
}

impl<'a> AsDocument<'a, 'a> for Action {
    fn as_document(&'a self) -> &'a yamlpath::Document {
        &self.document
    }
}

impl std::ops::Deref for Action {
    type Target = action::Action;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl std::fmt::Debug for Action {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{key}", key = self.key)
    }
}

impl HasInputs for Action {
    fn get_input(&self, name: &str) -> Option<Capability> {
        self.inputs.get(name).map(|_| Capability::Arbitrary)
    }
}

impl Action {
    pub(crate) fn from_string(contents: &str, key: InputKey) -> Result<Self, CollectionError> {
        let inner = Self::validate(contents)?;

        let document = yamlpath::Document::new(contents)?;

        Ok(Self {
            key,
            document,
            inner,
        })
    }

    pub(crate) fn docker(&self) -> Option<DockerAction<'_>> {
        match &self.inner.runs {
            action::Runs::Docker(docker) => Some(DockerAction {
                inner: docker,
                parent: self,
            }),
            _ => None,
        }
    }

    pub(crate) fn steps(&self) -> Option<CompositeSteps<'_>> {
        CompositeSteps::new(self)
    }

    pub(crate) fn location(&self) -> SymbolicLocation<'_> {
        SymbolicLocation {
            key: &self.key,
            link: None,
            annotation: "this action".into(),
            route: yamlpath::Route::default(),
            feature_kind: SymbolicFeature::Normal,
            kind: crate::features::audit_workflow::finding::location::LocationKind::default(),
        }
    }

    pub(crate) fn conditions(&self) -> impl Iterator<Item = (&common::If, SymbolicLocation<'_>)> {
        self.steps()
            .into_iter()
            .flatten()
            .filter_map(|step| step.r#if.as_ref().map(|cond| (cond, step.location())))
    }
}

pub(crate) struct DockerAction<'a> {
    inner: &'a action::Docker,
    parent: &'a Action,
}

impl<'a> std::ops::Deref for DockerAction<'a> {
    type Target = &'a action::Docker;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<'doc> Locatable<'doc> for DockerAction<'doc> {
    fn location(&self) -> SymbolicLocation<'doc> {
        self.parent
            .location()
            .annotated("this Docker action")
            .with_keys(["runs".into()])
    }
}

impl<'a, 'doc> AsDocument<'a, 'doc> for DockerAction<'doc> {
    fn as_document(&'a self) -> &'doc yamlpath::Document {
        self.parent.as_document()
    }
}

pub(crate) struct CompositeSteps<'a> {
    inner: std::iter::Enumerate<std::slice::Iter<'a, github_actions_models::action::Step>>,
    parent: &'a Action,
}

impl<'a> CompositeSteps<'a> {
    fn new(action: &'a Action) -> Option<Self> {
        match &action.inner.runs {
            action::Runs::Composite(composite) => Some(Self {
                inner: composite.steps.iter().enumerate(),
                parent: action,
            }),
            _ => None,
        }
    }
}

impl<'a> Iterator for CompositeSteps<'a> {
    type Item = CompositeStep<'a>;

    fn next(&mut self) -> Option<Self::Item> {
        for (idx, step) in self.inner.by_ref() {
            if let Some(cond) = step.r#if.as_ref()
                && crate::features::audit_workflow::models::if_is_statically_false(cond)
            {
                continue;
            }
            return Some(CompositeStep::new(idx, step, self.parent));
        }
        None
    }
}

pub(crate) struct CompositeStep<'a> {
    pub(crate) index: usize,

    pub(crate) inner: &'a action::Step,

    pub(crate) parent: &'a Action,
}

impl<'a> std::ops::Deref for CompositeStep<'a> {
    type Target = &'a action::Step;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl<'doc> Locatable<'doc> for CompositeStep<'doc> {
    fn location(&self) -> SymbolicLocation<'doc> {
        self.parent.location().annotated("this step").with_keys([
            "runs".into(),
            "steps".into(),
            self.index.into(),
        ])
    }

    fn location_with_grip(&self) -> SymbolicLocation<'doc> {
        if self.inner.name.is_some() {
            self.location().with_keys(["name".into()])
        } else if self.inner.id.is_some() {
            self.location().with_keys(["id".into()])
        } else {
            self.location()
        }
    }
}

impl HasInputs for CompositeStep<'_> {
    fn get_input(&self, name: &str) -> Option<Capability> {
        self.parent.get_input(name)
    }
}

impl<'doc> StepCommon<'doc> for CompositeStep<'doc> {
    fn ord(&self) -> impl Ord {
        self.index
    }

    fn env_is_static(&self, ctx: &context::Context) -> bool {
        utils::env_is_static(ctx, &[&self.env])
    }

    fn uses(&self) -> Option<&'doc common::Uses> {
        let action::StepBody::Uses { uses, .. } = &self.inner.body else {
            return None;
        };

        Some(uses)
    }

    fn matrix(&self) -> Option<Matrix<'doc>> {
        None
    }

    fn body(&self) -> Option<StepBodyCommon<'doc>> {
        Some(match &self.body {
            action::StepBody::Uses { uses, with } => StepBodyCommon::Uses { uses, with },
            action::StepBody::Run {
                run,
                working_directory,
                shell,
            } => StepBodyCommon::Run {
                run,
                _working_directory: working_directory.as_deref(),
                _shell: Some(shell),
            },
        })
    }

    fn document(&self) -> &'doc yamlpath::Document {
        self.action().as_document()
    }

    fn shell(&self) -> Option<(&str, SymbolicLocation<'doc>)> {
        if let action::StepBody::Run {
            shell: LoE::Literal(shell),
            ..
        } = &self.inner.body
        {
            Some((
                shell,
                self.location()
                    .with_keys(["shell".into()])
                    .annotated("shell defined here"),
            ))
        } else {
            None
        }
    }
}

impl<'a> CompositeStep<'a> {
    pub(crate) fn new(index: usize, inner: &'a action::Step, parent: &'a Action) -> Self {
        Self {
            index,
            inner,
            parent,
        }
    }

    pub(crate) fn action(&self) -> &'a Action {
        self.parent
    }
}

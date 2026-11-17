use github_actions_models::dependabot;

use crate::features::audit_workflow::{
    finding::location::{Locatable, SymbolicFeature, SymbolicLocation},
    models::{AsDocument, Validatable},
    registry::input::{CollectionError, InputKey},
};

pub(crate) struct Dependabot {
    pub(crate) key: InputKey,
    document: yamlpath::Document,
    inner: dependabot::v2::Dependabot,
}

impl Validatable<'_> for Dependabot {
    type Target = dependabot::v2::Dependabot;

    type Skeleton = yaml_serde::Mapping;
}

impl<'a> AsDocument<'a, 'a> for Dependabot {
    fn as_document(&'a self) -> &'a yamlpath::Document {
        &self.document
    }
}

impl std::ops::Deref for Dependabot {
    type Target = dependabot::v2::Dependabot;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl std::fmt::Debug for Dependabot {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{key}", key = self.key)
    }
}

impl Dependabot {
    pub(crate) fn from_string(contents: &str, key: InputKey) -> Result<Self, CollectionError> {
        let inner = Self::validate(contents)?;

        let document = yamlpath::Document::new(contents)?;

        Ok(Self {
            key,
            document,
            inner,
        })
    }

    pub(crate) fn location(&self) -> SymbolicLocation<'_> {
        SymbolicLocation {
            key: &self.key,
            link: None,
            annotation: "this config".into(),
            route: yamlpath::Route::default(),
            feature_kind: SymbolicFeature::Normal,
            kind: crate::features::audit_workflow::finding::location::LocationKind::default(),
        }
    }

    pub(crate) fn updates(&self) -> Updates<'_> {
        Updates::new(self)
    }
}

pub(crate) struct Updates<'doc> {
    parent: &'doc Dependabot,
    inner:
        std::iter::Enumerate<std::slice::Iter<'doc, github_actions_models::dependabot::v2::Update>>,
}

impl<'doc> Updates<'doc> {
    fn new(parent: &'doc Dependabot) -> Self {
        Self {
            parent,
            inner: parent.inner.updates.iter().enumerate(),
        }
    }
}

impl<'doc> Iterator for Updates<'doc> {
    type Item = Update<'doc>;

    fn next(&mut self) -> Option<Self::Item> {
        self.inner.next().map(|(idx, update)| Update {
            parent: self.parent,
            index: idx,
            inner: update,
        })
    }
}

pub(crate) struct Update<'doc> {
    parent: &'doc Dependabot,
    index: usize,
    inner: &'doc github_actions_models::dependabot::v2::Update,
}

impl std::ops::Deref for Update<'_> {
    type Target = github_actions_models::dependabot::v2::Update;

    fn deref(&self) -> &Self::Target {
        self.inner
    }
}

impl<'doc> Locatable<'doc> for Update<'doc> {
    fn location(&self) -> SymbolicLocation<'doc> {
        self.parent
            .location()
            .with_keys(["updates".into(), self.index.into()])
            .annotated("this update rule")
    }

    fn location_with_grip(&self) -> SymbolicLocation<'doc> {
        self.location()
            .with_keys(["package-ecosystem".into()])
            .annotated("this ecosystem")
    }
}

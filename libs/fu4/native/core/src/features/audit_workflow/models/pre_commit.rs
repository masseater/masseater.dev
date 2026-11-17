use pre_commit_models::config::RemoteRepo;

use crate::features::audit_workflow::{
    finding::location::{Locatable, SymbolicFeature, SymbolicLocation},
    models::{AsDocument, Validatable},
    registry::input::{CollectionError, InputKey},
};

pub(crate) struct PreCommitConfig {
    pub(crate) key: InputKey,
    document: yamlpath::Document,
    inner: pre_commit_models::config::Config,
}

impl Validatable<'_> for PreCommitConfig {
    type Target = pre_commit_models::config::Config;

    type Skeleton = yaml_serde::Mapping;
}

impl<'a> AsDocument<'a, 'a> for PreCommitConfig {
    fn as_document(&'a self) -> &'a yamlpath::Document {
        &self.document
    }
}

impl std::ops::Deref for PreCommitConfig {
    type Target = pre_commit_models::config::Config;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl std::fmt::Debug for PreCommitConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{key}", key = self.key)
    }
}

impl PreCommitConfig {
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
            annotation: "this pre-commit config".into(),
            route: yamlpath::Route::default(),
            feature_kind: SymbolicFeature::Normal,
            kind: crate::features::audit_workflow::finding::location::LocationKind::default(),
        }
    }

    pub(crate) fn repos(&self) -> Repos<'_> {
        Repos::new(self)
    }
}

pub(crate) struct Repos<'doc> {
    parent: &'doc PreCommitConfig,
    inner: std::iter::Enumerate<std::slice::Iter<'doc, pre_commit_models::config::Repo>>,
}

impl<'doc> Repos<'doc> {
    pub(crate) fn new(config: &'doc PreCommitConfig) -> Self {
        Self {
            parent: config,
            inner: config.repos.iter().enumerate(),
        }
    }
}

impl<'doc> Iterator for Repos<'doc> {
    type Item = Repo<'doc>;

    fn next(&mut self) -> Option<Self::Item> {
        let (idx, inner) = self.inner.next()?;

        Some(Repo::new(idx, inner, self.parent))
    }
}

pub(crate) struct Repo<'doc> {
    index: usize,
    inner: &'doc pre_commit_models::config::Repo,
    parent: &'doc PreCommitConfig,
}

impl<'doc> Repo<'doc> {
    fn new(
        index: usize,
        inner: &'doc pre_commit_models::config::Repo,
        parent: &'doc PreCommitConfig,
    ) -> Self {
        Self {
            index,
            inner,
            parent,
        }
    }

    pub(crate) fn repo(&self) -> Option<&'doc RemoteRepo> {
        match self.inner {
            pre_commit_models::config::Repo::Remote(remote) => Some(remote),
            _ => None,
        }
    }
}

impl<'a, 'doc> AsDocument<'a, 'doc> for Repo<'doc> {
    fn as_document(&'a self) -> &'doc yamlpath::Document {
        self.parent.as_document()
    }
}

impl<'doc> Locatable<'doc> for Repo<'doc> {
    fn location(&self) -> SymbolicLocation<'doc> {
        self.parent
            .location()
            .with_keys(["repos".into(), self.index.into()])
            .annotated("this repo")
    }

    fn location_with_grip(&self) -> SymbolicLocation<'doc> {
        self.location().with_keys(["repo".into()])
    }
}

pub(crate) struct PreCommitHooks {
    pub(crate) key: InputKey,
    document: yamlpath::Document,
    inner: pre_commit_models::hooks::Hooks,
}

impl Validatable<'_> for PreCommitHooks {
    type Target = pre_commit_models::hooks::Hooks;

    type Skeleton = yaml_serde::Sequence;
}

impl<'a> AsDocument<'a, 'a> for PreCommitHooks {
    fn as_document(&'a self) -> &'a yamlpath::Document {
        &self.document
    }
}

impl std::ops::Deref for PreCommitHooks {
    type Target = pre_commit_models::hooks::Hooks;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl std::fmt::Debug for PreCommitHooks {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{key}", key = self.key)
    }
}

impl PreCommitHooks {
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
            annotation: "this pre-commit hooks definition".into(),
            route: yamlpath::Route::default(),
            feature_kind: SymbolicFeature::Normal,
            kind: crate::features::audit_workflow::finding::location::LocationKind::default(),
        }
    }
}

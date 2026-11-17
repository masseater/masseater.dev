use std::collections::BTreeMap;

use camino::{Utf8Path, Utf8PathBuf};
use itertools::Itertools as _;
use serde::Serialize;
use thiserror::Error;

use crate::features::audit_workflow::{
    audit::AuditInput,
    config::{Config, ConfigError},
    models::{
        action::Action,
        dependabot::Dependabot,
        lock::Lock,
        pre_commit::{PreCommitConfig, PreCommitHooks},
        workflow::Workflow,
    },
};

#[derive(Debug, Error)]
pub(crate) enum CollectionError {
    #[error("invalid YAML syntax: {0}")]
    Syntax(#[source] anyhow::Error),

    #[error("couldn't turn input into a an appropriate model")]
    Model(#[from] yaml_serde::Error),

    #[error("failed to load internal pathing document")]
    Yamlpath(#[from] yamlpath::QueryError),

    #[error(transparent)]
    Config(#[from] ConfigError),

    #[error("can't register the same input more than once: {0}")]
    DuplicateInput(InputKey),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Copy, Clone, Eq, Hash, PartialEq, Serialize, PartialOrd, Ord)]
pub(crate) enum InputKind {
    Workflow,
    Action,
    Dependabot,
    PreCommitConfig,
    PreCommitHooks,
}

impl InputKind {
    pub(crate) fn from_path(path: &Utf8Path) -> Option<Self> {
        if !matches!(path.extension(), Some("yml" | "yaml")) {
            return None;
        }

        let parent = path.parent()?;
        if parent.ends_with(".github/workflows") {
            return Some(Self::Workflow);
        }

        Some(match path.file_name()? {
            "action.yml" | "action.yaml" => Self::Action,
            "dependabot.yml" | "dependabot.yaml" => Self::Dependabot,
            ".pre-commit-config.yaml" => Self::PreCommitConfig,
            ".pre-commit-hooks.yaml" => Self::PreCommitHooks,
            _ => Self::Workflow,
        })
    }

    pub(crate) fn parse(
        self,
        contents: &str,
        key: InputKey,
    ) -> Result<AuditInput, CollectionError> {
        match self {
            Self::Workflow => Workflow::from_string(contents, key).map(Into::into),
            Self::Action => Action::from_string(contents, key).map(Into::into),
            Self::Dependabot => Dependabot::from_string(contents, key).map(Into::into),
            Self::PreCommitConfig => PreCommitConfig::from_string(contents, key).map(Into::into),
            Self::PreCommitHooks => PreCommitHooks::from_string(contents, key).map(Into::into),
        }
    }
}

impl std::fmt::Display for InputKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Workflow => write!(f, "workflow"),
            Self::Action => write!(f, "action"),
            Self::Dependabot => write!(f, "dependabot config"),
            Self::PreCommitConfig => write!(f, "pre-commit config"),
            Self::PreCommitHooks => write!(f, "pre-commit hooks definition"),
        }
    }
}

#[derive(Debug, Clone, Eq, Hash, PartialEq, Serialize, PartialOrd, Ord)]
pub(crate) struct InputKey {
    verbatim_path: Utf8PathBuf,

    #[serde(skip)]
    root_relative_path: Option<Utf8PathBuf>,
}

impl std::fmt::Display for InputKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "file://{path}", path = self.verbatim_path)
    }
}

impl InputKey {
    pub(crate) fn local(verbatim_path: impl AsRef<Utf8Path>, root: Option<&Root>) -> Self {
        let verbatim_path = verbatim_path.as_ref();

        let root_relative_path = root
            .and_then(|root| verbatim_path.strip_prefix(root.path()).ok())
            .map(|relative| relative.components().join("/").into());

        Self {
            verbatim_path: verbatim_path.to_path_buf(),
            root_relative_path,
        }
    }

    pub(crate) fn root_relative_path(&self) -> Option<&Utf8Path> {
        self.root_relative_path.as_deref()
    }

    pub(crate) fn presentation_path(&self) -> &str {
        self.verbatim_path.as_str()
    }

    pub(crate) fn filename(&self) -> &str {
        self.verbatim_path
            .file_name()
            .expect("expected input key to have a filename component")
    }
}

#[derive(Clone, Debug)]
pub(crate) struct Root {
    path: Utf8PathBuf,
}

impl Root {
    pub(crate) fn new(path: impl Into<Utf8PathBuf>) -> Self {
        Self { path: path.into() }
    }

    pub(crate) fn path(&self) -> &Utf8Path {
        self.path.as_path()
    }
}

pub(crate) struct InputGroup {
    config: Config,
    root: Option<Root>,
    lock: Option<Lock>,
    inputs: BTreeMap<InputKey, AuditInput>,
}

impl InputGroup {
    pub(crate) fn new(config: Config, root: Option<Root>) -> Result<Self, CollectionError> {
        let lock = root
            .as_ref()
            .map(Lock::discover_local)
            .transpose()?
            .flatten();
        Ok(Self {
            config,
            root,
            lock,
            inputs: BTreeMap::new(),
        })
    }

    pub(crate) fn config(&self) -> &Config {
        &self.config
    }

    pub(crate) fn lock(&self) -> Option<&Lock> {
        self.lock.as_ref()
    }

    pub(crate) fn key(&self, path: impl AsRef<Utf8Path>) -> InputKey {
        InputKey::local(path, self.root.as_ref())
    }

    pub(crate) fn register(
        &mut self,
        kind: InputKind,
        contents: &str,
        key: InputKey,
    ) -> Result<(), CollectionError> {
        let input = kind.parse(contents, key)?;
        if self.inputs.contains_key(input.key()) {
            return Err(CollectionError::DuplicateInput(input.key().clone()));
        }
        self.inputs.insert(input.key().clone(), input);
        Ok(())
    }

    pub(crate) fn inputs(&self) -> impl Iterator<Item = &AuditInput> {
        self.inputs.values()
    }
}

#[cfg(test)]
mod tests {
    use super::{InputKey, Root};

    #[test]
    fn test_input_key_display() {
        let local = InputKey::local("/foo/bar/baz.yml", None);
        assert_eq!(local.to_string(), "file:///foo/bar/baz.yml");
    }

    #[test]
    fn test_input_key_root_relative_path() {
        let root = Root::new("/home/runner/work/repo/repo");
        let local = InputKey::local(
            "/home/runner/work/repo/repo/.github/workflows/baz.yml",
            Some(&root),
        );
        assert_eq!(
            local.root_relative_path().map(camino::Utf8Path::as_str),
            Some(".github/workflows/baz.yml")
        );
    }
}

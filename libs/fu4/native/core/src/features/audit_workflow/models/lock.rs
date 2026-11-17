use github_actions_models::lock;

use crate::features::audit_workflow::{
    models::Validatable,
    registry::input::{CollectionError, InputKey, Root},
};

const LOCKFILE_PATH: &str = ".github/workflows/actions.lock";

pub(crate) struct Lock {
    inner: lock::Lock,
}

impl Validatable<'_> for Lock {
    type Target = lock::Lock;

    type Skeleton = yaml_serde::Mapping;
}

impl std::ops::Deref for Lock {
    type Target = lock::Lock;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl Lock {
    fn from_string(contents: &str) -> Result<Self, CollectionError> {
        Self::validate(contents).map(|lock| Self { inner: lock })
    }

    pub(crate) fn discover_local(root: &Root) -> Result<Option<Self>, CollectionError> {
        let lockfile_path = root.path().join(LOCKFILE_PATH);

        match std::fs::read_to_string(lockfile_path) {
            Ok(contents) => Ok(Some(Self::from_string(&contents)?)),
            Err(err) if matches!(err.kind(), std::io::ErrorKind::NotFound) => Ok(None),
            Err(err) => Err(err.into()),
        }
    }

    pub(crate) fn is_locked(&self, input: &impl AsRef<InputKey>) -> bool {
        input
            .as_ref()
            .root_relative_path()
            .is_some_and(|path| self.inner.workflows.contains_key(path.as_str()))
    }
}

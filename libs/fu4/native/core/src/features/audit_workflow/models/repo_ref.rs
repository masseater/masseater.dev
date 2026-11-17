use github_actions_models::common::RepositoryUses;
use pre_commit_models::config::RemoteRepo;
use url::Url;

use crate::features::audit_workflow::{
    models::uses::RepositoryUsesPattern, utils::once::warn_once,
};

#[derive(Copy, Clone, Debug)]
pub(crate) struct Slug<'doc> {
    owner: &'doc str,

    repo: &'doc str,

    full: &'doc str,
}

impl<'doc> Slug<'doc> {
    fn new(owner: &'doc str, repo: &'doc str, slug: &'doc str) -> Self {
        Self {
            owner,
            repo,
            full: slug,
        }
    }

    pub(crate) fn owner(&self) -> &'doc str {
        self.owner
    }

    pub(crate) fn repo(&self) -> &'doc str {
        self.repo
    }

    pub(crate) fn slug(&self) -> &'doc str {
        self.full
    }
}

impl<'doc> From<&'doc RepositoryUses> for Slug<'doc> {
    fn from(uses: &'doc RepositoryUses) -> Self {
        Self::new(uses.owner(), uses.repo(), uses.slug())
    }
}

impl std::fmt::Display for Slug<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.slug())
    }
}

#[derive(Debug)]
pub(crate) enum RepoRef<'doc> {
    Uses(&'doc RepositoryUses),

    Url {
        _url: &'doc Url,

        slug: Option<Slug<'doc>>,

        git_ref: &'doc str,
    },
}

impl<'doc> RepoRef<'doc> {
    pub(crate) fn from_url(url: &'doc Url, git_ref: &'doc str) -> Self {
        let slug = if url.host_str() == Some("github.com") {
            let path = url.path().strip_suffix(".git").unwrap_or(url.path());
            let mut parts = path.split('/');

            if let Some("") = parts.next()
                && let Some(owner) = parts.next()
                && !owner.is_empty()
                && let Some(repo) = parts.next()
                && !repo.is_empty()
                && let None = parts.next()
            {
                Some(Slug::new(owner, repo, &path[1..]))
            } else {
                warn_once!("invalid looking GitHub repository URL: {url}");
                None
            }
        } else {
            None
        };

        Self::Url {
            _url: url,
            slug,
            git_ref,
        }
    }

    pub(crate) fn slug(&self) -> Option<Slug<'doc>> {
        match self {
            RepoRef::Uses(uses) => Some(Slug::from(*uses)),
            RepoRef::Url { slug, .. } => slug.as_ref().copied(),
        }
    }

    pub(crate) fn subpath(&self) -> Option<&'doc str> {
        match self {
            RepoRef::Uses(uses) => uses.subpath(),
            RepoRef::Url { .. } => None,
        }
    }

    pub(crate) fn git_ref(&self) -> &'doc str {
        match self {
            RepoRef::Uses(uses) => uses.git_ref(),
            RepoRef::Url { git_ref, .. } => git_ref,
        }
    }

    pub(crate) fn ref_is_commit(&self) -> bool {
        self.git_ref().len() == 40 && self.git_ref().chars().all(|c| c.is_ascii_hexdigit())
    }

    pub(crate) fn commit_ref(&self) -> Option<&'doc str> {
        match &self.git_ref() {
            git_ref if self.ref_is_commit() => Some(*git_ref),
            _ => None,
        }
    }

    pub(crate) fn symbolic_ref(&self) -> Option<&'doc str> {
        match &self.git_ref() {
            git_ref if !self.ref_is_commit() => Some(*git_ref),
            _ => None,
        }
    }

    pub(crate) fn matches(&self, template: &str) -> bool {
        let Ok(pat) = template.parse::<RepositoryUsesPattern>() else {
            return false;
        };

        pat.matches(self)
    }
}

impl<'doc> From<&'doc RepositoryUses> for RepoRef<'doc> {
    fn from(uses: &'doc RepositoryUses) -> Self {
        Self::Uses(uses)
    }
}

impl<'doc> From<&'doc RemoteRepo> for RepoRef<'doc> {
    fn from(repo: &'doc RemoteRepo) -> Self {
        Self::from_url(&repo.repo, &repo.rev)
    }
}

#[cfg(test)]
mod tests {
    use url::Url;

    use crate::features::audit_workflow::models::repo_ref::{RepoRef, Slug};

    #[test]
    fn test_slug_display() {
        let slug = Slug::new("foo", "bar", "foo/bar");
        assert_eq!(slug.to_string(), "foo/bar");
    }

    #[test]
    fn test_reporef_from_url() {
        let url = Url::parse("https://example.com/nonsense").unwrap();
        insta::assert_debug_snapshot!(RepoRef::from_url(&url, "v1"), @r#"
        Url {
            _url: Url {
                scheme: "https",
                cannot_be_a_base: false,
                username: "",
                password: None,
                host: Some(
                    Domain(
                        "example.com",
                    ),
                ),
                port: None,
                path: "/nonsense",
                query: None,
                fragment: None,
            },
            slug: None,
            git_ref: "v1",
        }
        "#);

        let url = Url::parse("https://github.com/foo/bar").unwrap();
        insta::assert_debug_snapshot!(RepoRef::from_url(&url, "v1"), @r#"
        Url {
            _url: Url {
                scheme: "https",
                cannot_be_a_base: false,
                username: "",
                password: None,
                host: Some(
                    Domain(
                        "github.com",
                    ),
                ),
                port: None,
                path: "/foo/bar",
                query: None,
                fragment: None,
            },
            slug: Some(
                Slug {
                    owner: "foo",
                    repo: "bar",
                    full: "foo/bar",
                },
            ),
            git_ref: "v1",
        }
        "#);

        let url = Url::parse("https://github.com/pre-commit/pre-commit-hooks.git").unwrap();
        insta::assert_debug_snapshot!(RepoRef::from_url(&url, "v1"), @r#"
        Url {
            _url: Url {
                scheme: "https",
                cannot_be_a_base: false,
                username: "",
                password: None,
                host: Some(
                    Domain(
                        "github.com",
                    ),
                ),
                port: None,
                path: "/pre-commit/pre-commit-hooks.git",
                query: None,
                fragment: None,
            },
            slug: Some(
                Slug {
                    owner: "pre-commit",
                    repo: "pre-commit-hooks",
                    full: "pre-commit/pre-commit-hooks",
                },
            ),
            git_ref: "v1",
        }
        "#);

        let url = Url::parse("https://github.com/foo/").unwrap();
        insta::assert_debug_snapshot!(RepoRef::from_url(&url, "v1"), @r#"
        Url {
            _url: Url {
                scheme: "https",
                cannot_be_a_base: false,
                username: "",
                password: None,
                host: Some(
                    Domain(
                        "github.com",
                    ),
                ),
                port: None,
                path: "/foo/",
                query: None,
                fragment: None,
            },
            slug: None,
            git_ref: "v1",
        }
        "#);
    }
}

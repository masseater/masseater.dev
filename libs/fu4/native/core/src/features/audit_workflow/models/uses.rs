use std::{str::FromStr, sync::LazyLock};

use github_actions_models::common::{RepositoryUses, Uses};
use regex::Regex;
use serde::Deserialize;

use crate::features::audit_workflow::models::repo_ref::{RepoRef, Slug};

static REPOSITORY_USES_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?xmi)                   # verbose, multi-line mode, case-insensitive
        ^                           # start of line
        ([\w-]+)                    # (1) owner
        /                           # /
        ([\w\.-]+|\*)               # (2) repo or *
        (?:                         # non-capturing group for optional subpath
          /                         # /
          (                         # (3) subpath
            [[[:graph:]]&&[^@\*]]+  # any non-space, non-@, non-* characters
            |                       # OR
            \*                      # *
          )                         # end of (3) subpath
        )?                          # end of non-capturing group for optional subpath
        (?:                         # non-capturing group for optional git ref
          @                         # @
          ([[[:graph:]]&&[^\*]]+)   # (4) git ref (any non-space, non-* characters)
        )?                          # end of non-capturing group for optional git ref
        $                           # end of line
        ",
    )
    .unwrap()
});

#[derive(Clone, Debug, Eq, PartialEq, Hash, PartialOrd, Ord)]
pub(crate) enum RepositoryUsesPattern {
    ExactWithRef {
        owner: String,
        repo: String,
        subpath: Option<String>,
        git_ref: String,
    },

    ExactPath {
        owner: String,
        repo: String,
        subpath: String,
    },

    ExactRepo {
        owner: String,
        repo: String,
    },

    InRepo {
        owner: String,
        repo: String,
    },

    InOwner(String),

    Any,
}

impl RepositoryUsesPattern {
    pub(crate) fn matches(&self, repo: &RepoRef<'_>) -> bool {
        match repo {
            RepoRef::Uses(uses) => self.matches_uses(uses),
            RepoRef::Url {
                _url,
                slug: Some(slug),
                git_ref,
            } => self.matches_slug(slug, git_ref),

            RepoRef::Url { slug: None, .. } => false,
        }
    }

    fn matches_slug(&self, slug: &Slug<'_>, slug_git_ref: &str) -> bool {
        match self {
            Self::ExactWithRef {
                owner,
                repo,
                subpath,
                git_ref,
            } => {
                if subpath.is_some() {
                    false
                } else {
                    slug.owner().eq_ignore_ascii_case(owner)
                        && slug.repo().eq_ignore_ascii_case(repo)
                        && slug_git_ref == git_ref
                }
            }
            Self::ExactPath { .. } => false,

            Self::ExactRepo { owner, repo } | Self::InRepo { owner, repo } => {
                slug.owner().eq_ignore_ascii_case(owner) && slug.repo().eq_ignore_ascii_case(repo)
            }
            Self::InOwner(owner) => slug.owner().eq_ignore_ascii_case(owner),
            Self::Any => true,
        }
    }

    fn matches_uses(&self, uses: &RepositoryUses) -> bool {
        match self {
            Self::ExactWithRef {
                owner,
                repo,
                subpath,
                git_ref,
            } => {
                uses.owner().eq_ignore_ascii_case(owner)
                    && uses.repo().eq_ignore_ascii_case(repo)
                    && uses.subpath() == subpath.as_deref()
                    && uses.git_ref() == git_ref
            }
            Self::ExactPath {
                owner,
                repo,
                subpath,
            } => {
                uses.owner().eq_ignore_ascii_case(owner)
                    && uses.repo().eq_ignore_ascii_case(repo)
                    && uses.subpath().is_some_and(|s| s == subpath)
            }
            Self::ExactRepo { owner, repo } => {
                uses.owner().eq_ignore_ascii_case(owner)
                    && uses.repo().eq_ignore_ascii_case(repo)
                    && uses.subpath().is_none()
            }
            Self::InRepo { owner, repo } => {
                uses.owner().eq_ignore_ascii_case(owner) && uses.repo().eq_ignore_ascii_case(repo)
            }
            Self::InOwner(owner) => uses.owner().eq_ignore_ascii_case(owner),
            Self::Any => true,
        }
    }
}

impl FromStr for RepositoryUsesPattern {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s == "*" {
            return Ok(Self::Any);
        }

        let caps = REPOSITORY_USES_PATTERN
            .captures(s)
            .ok_or_else(|| anyhow::anyhow!("invalid pattern: {s}"))?;

        let owner = &caps[1];
        let repo = &caps[2];
        let subpath = caps.get(3).map(|m| m.as_str());
        let git_ref = caps.get(4).map(|m| m.as_str());

        match (owner, repo, subpath, git_ref) {
            (owner, "*", None, None) => Ok(Self::InOwner(owner.into())),
            (owner, repo, None, None) => Ok(Self::ExactRepo {
                owner: owner.into(),
                repo: repo.into(),
            }),
            (_, "*", Some(_), _) | (_, _, Some("*"), Some(_)) => {
                Err(anyhow::anyhow!("invalid pattern: {s}"))
            }
            (owner, repo, Some("*"), None) => Ok(Self::InRepo {
                owner: owner.into(),
                repo: repo.into(),
            }),
            (owner, repo, Some(subpath), None) => Ok(Self::ExactPath {
                owner: owner.into(),
                repo: repo.into(),
                subpath: subpath.into(),
            }),
            (owner, repo, subpath, Some(git_ref)) => Ok(Self::ExactWithRef {
                owner: owner.into(),
                repo: repo.into(),
                subpath: subpath.map(std::convert::Into::into),
                git_ref: git_ref.into(),
            }),
        }
    }
}

impl std::fmt::Display for RepositoryUsesPattern {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Any => write!(f, "*"),
            Self::InOwner(owner) => write!(f, "{owner}/*"),
            Self::InRepo { owner, repo } => write!(f, "{owner}/{repo}/*"),
            Self::ExactRepo { owner, repo } => write!(f, "{owner}/{repo}"),
            Self::ExactPath {
                owner,
                repo,
                subpath,
            } => write!(f, "{owner}/{repo}/{subpath}"),
            Self::ExactWithRef {
                owner,
                repo,
                subpath,
                git_ref,
            } => match subpath {
                Some(subpath) => write!(f, "{owner}/{repo}/{subpath}@{git_ref}"),
                None => write!(f, "{owner}/{repo}@{git_ref}"),
            },
        }
    }
}

impl<'de> Deserialize<'de> for RepositoryUsesPattern {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Self::from_str(&s).map_err(serde::de::Error::custom)
    }
}

pub(crate) trait RepositoryUsesExt {
    fn matches(&self, pattern: &str) -> bool;

    fn ref_is_commit(&self) -> bool;

    fn commit_ref(&self) -> Option<&str>;

    fn symbolic_ref(&self) -> Option<&str>;
}

impl RepositoryUsesExt for RepositoryUses {
    fn matches(&self, template: &str) -> bool {
        RepoRef::from(self).matches(template)
    }

    fn ref_is_commit(&self) -> bool {
        RepoRef::from(self).ref_is_commit()
    }

    fn commit_ref(&self) -> Option<&str> {
        RepoRef::from(self).commit_ref()
    }

    fn symbolic_ref(&self) -> Option<&str> {
        RepoRef::from(self).symbolic_ref()
    }
}

pub(crate) trait UsesExt {
    fn unpinned(&self) -> bool;
    fn unhashed(&self) -> bool;
}

impl UsesExt for Uses {
    fn unpinned(&self) -> bool {
        match self {
            Self::Docker(docker) => docker.hash().is_none() && docker.tag().is_none(),
            Self::Repository(_) => false,

            Self::Local(_) => true,
        }
    }

    fn unhashed(&self) -> bool {
        match self {
            Self::Local(_) => false,
            Self::Repository(repo) => !RepoRef::from(repo).ref_is_commit(),
            Self::Docker(docker) => docker.hash().is_none(),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr as _;

    use anyhow::anyhow;
    use github_actions_models::common::Uses;
    use url::Url;

    use crate::features::audit_workflow::models::repo_ref::RepoRef;

    use super::RepositoryUsesPattern;

    #[test]
    fn test_repositoryusespattern_parse() {
        for (pattern, expected) in [
            ("", None),
            ("/", None),
            ("//", None),
            ("///", None),
            ("owner", None),
            ("**", None),
            ("*", Some(RepositoryUsesPattern::Any)),
            (
                "owner/*",
                Some(RepositoryUsesPattern::InOwner("owner".into())),
            ),
            ("owner/*/", None),
            ("owner/*/foo", None),
            ("owner/*/*", None),
            ("*/foo", None),
            ("owner/repo/**", None),
            (
                "owner/repo/*",
                Some(RepositoryUsesPattern::InRepo {
                    owner: "owner".into(),
                    repo: "repo".into(),
                }),
            ),
            (
                "owner/repo",
                Some(RepositoryUsesPattern::ExactRepo {
                    owner: "owner".into(),
                    repo: "repo".into(),
                }),
            ),
            (
                "owner/repo/subpath",
                Some(RepositoryUsesPattern::ExactPath {
                    owner: "owner".into(),
                    repo: "repo".into(),
                    subpath: "subpath".into(),
                }),
            ),
            (
                "owner/repo//",
                Some(RepositoryUsesPattern::ExactPath {
                    owner: "owner".into(),
                    repo: "repo".into(),
                    subpath: "/".into(),
                }),
            ),
            (
                "owner/repo/subpath/",
                Some(RepositoryUsesPattern::ExactPath {
                    owner: "owner".into(),
                    repo: "repo".into(),
                    subpath: "subpath/".into(),
                }),
            ),
            (
                "owner/repo/subpath/very/nested////and/literal",
                Some(RepositoryUsesPattern::ExactPath {
                    owner: "owner".into(),
                    repo: "repo".into(),
                    subpath: "subpath/very/nested////and/literal".into(),
                }),
            ),
            (
                "owner/repo@v1",
                Some(RepositoryUsesPattern::ExactWithRef {
                    owner: "owner".into(),
                    repo: "repo".into(),
                    subpath: None,
                    git_ref: "v1".into(),
                }),
            ),
            (
                "owner/repo/subpath@v1",
                Some(RepositoryUsesPattern::ExactWithRef {
                    owner: "owner".into(),
                    repo: "repo".into(),
                    subpath: Some("subpath".into()),
                    git_ref: "v1".into(),
                }),
            ),
            (
                "owner/repo@172239021f7ba04fe7327647b213799853a9eb89",
                Some(RepositoryUsesPattern::ExactWithRef {
                    owner: "owner".into(),
                    repo: "repo".into(),
                    subpath: None,
                    git_ref: "172239021f7ba04fe7327647b213799853a9eb89".into(),
                }),
            ),
            (
                "pypa/gh-action-pypi-publish@release/v1",
                Some(RepositoryUsesPattern::ExactWithRef {
                    owner: "pypa".into(),
                    repo: "gh-action-pypi-publish".into(),
                    subpath: None,
                    git_ref: "release/v1".into(),
                }),
            ),
            ("owner/repo/*@v1", None),
            ("owner/repo/*/subpath@v1", None),
            ("owner/*/subpath@v1", None),
            ("*/*/subpath@v1", None),
            ("owner/repo@*", None),
            ("owner/repo@**", None),
            ("owner/repo@***", None),
            ("owner/repo/subpath@*", None),
            ("owner/*@*", None),
            ("*@*", None),
        ] {
            let pattern = RepositoryUsesPattern::from_str(pattern).ok();
            assert_eq!(pattern, expected);
        }
    }

    #[test]
    fn test_repositoryusespattern_ord() {
        let mut patterns = vec![
            RepositoryUsesPattern::Any,
            RepositoryUsesPattern::ExactRepo {
                owner: "owner".into(),
                repo: "repo".into(),
            },
            RepositoryUsesPattern::InOwner("owner".into()),
        ];

        patterns.sort();

        assert_eq!(
            patterns,
            vec![
                RepositoryUsesPattern::ExactRepo {
                    owner: "owner".into(),
                    repo: "repo".into()
                },
                RepositoryUsesPattern::InOwner("owner".into()),
                RepositoryUsesPattern::Any,
            ]
        );
    }

    #[test]
    fn test_repositoryusespattern_matches_repo_ref() -> anyhow::Result<()> {
        for (url, git_ref, pattern, matches) in [
            (
                Url::parse("https://github.com/actions/checkout")?,
                "v3",
                "Actions/Checkout@v3",
                true,
            ),
            (
                Url::parse("https://notgithub.com/actions/checkout")?,
                "v3",
                "Actions/Checkout@v3",
                false,
            ),
            (
                Url::parse("https://github.com/actions/checkout")?,
                "v3",
                "Actions/Checkout/foo@v3",
                false,
            ),
        ] {
            let repo_ref = RepoRef::from_url(&url, git_ref);
            let pattern = RepositoryUsesPattern::from_str(pattern)?;

            assert_eq!(pattern.matches(&repo_ref), matches);
        }

        Ok(())
    }

    #[test]
    fn test_repositoryusespattern_matches_uses() -> anyhow::Result<()> {
        for (uses, pattern, matches) in [
            ("actions/checkout@v3", "Actions/Checkout@v3", true),
            ("actions/checkout/foo@v3", "Actions/Checkout/foo", true),
            ("actions/checkout@v3", "actions/checkout@V3", false),
            ("actions/checkout@v3", "foo/checkout", false),
            ("actions/checkout@v3", "actions/bar", false),
            ("actions/checkout/foo@v3", "actions/checkout@v3", false),
            ("actions/checkout@v3", "actions/checkout/foo@v3", false),
            ("actions/checkout/foo@v3", "actions/checkout/foo", true),
            ("ACTIONS/CHECKOUT/foo@v3", "actions/checkout/foo", true),
            ("ACTIONS/CHECKOUT@v3", "actions/checkout", true),
            ("actions/checkout@v3", "actions/checkout", true),
            ("actions/checkout/foo@v3", "actions/checkout", false),
            ("actions/somethingelse@v3", "actions/checkout", false),
            ("whatever/checkout@v3", "actions/checkout", false),
            ("ACTIONS/CHECKOUT@v3", "actions/checkout/*", true),
            ("actions/checkout@v3", "actions/checkout/*", true),
            ("actions/checkout/foo@v3", "actions/checkout/*", true),
            ("actions/checkout/foo/bar@v3", "actions/checkout/*", true),
            ("someoneelse/checkout@v3", "actions/checkout/*", false),
            ("ACTIONS/CHECKOUT@v3", "actions/*", true),
            ("actions/checkout@v3", "actions/*", true),
            ("actions/checkout/foo@v3", "actions/*", true),
            ("someoneelse/checkout@v3", "actions/*", false),
            ("actions/checkout@v3", "*", true),
            ("actions/checkout/foo@v3", "*", true),
            ("whatever/checkout@v3", "*", true),
            ("actions/checkout@v3", "actions/checkout@v3", true),
            ("actions/checkout/foo@v3", "actions/checkout/foo@v3", true),
            ("actions/checkout/foo@v1", "actions/checkout/foo@v3", false),
        ] {
            let Ok(Uses::Repository(uses)) = Uses::parse(uses) else {
                return Err(anyhow!("invalid uses: {uses}"));
            };

            let pattern = RepositoryUsesPattern::from_str(pattern)?;

            assert_eq!(
                pattern.matches_uses(&uses),
                matches,
                "pattern: {pattern:?}, uses: {uses:?}, matches: {matches}"
            );
        }

        Ok(())
    }
}

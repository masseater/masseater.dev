use std::{
    collections::{HashMap, HashSet},
    fmt::Display,
    str::FromStr,
    sync::{Arc, Mutex},
};

use base64::Engine as _;
use serde::{Deserialize, de::DeserializeOwned};
use thiserror::Error;
use tracing::instrument;
use ureq::{
    Agent,
    http::{Response, StatusCode},
    tls::{RootCerts, TlsConfig},
};

use crate::features::audit_workflow::{models::repo_ref::Slug, utils::ZIZMOR_AGENT};

mod lineref;
#[cfg(test)]
pub(crate) mod mock;
mod pktline;

const RETRIES: usize = 3;

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum GitHubHost {
    Enterprise(String),
    Standard(String),
}

impl GitHubHost {
    pub(crate) fn new(hostname: &str) -> Result<Self, String> {
        let normalized = hostname.to_lowercase();

        if normalized.starts_with("https://") || normalized.starts_with("http://") {
            return Err("must be a domain name, not a URL".into());
        }

        if normalized.eq_ignore_ascii_case("github.com") || normalized.ends_with(".ghe.com") {
            Ok(Self::Standard(hostname.into()))
        } else {
            Ok(Self::Enterprise(hostname.into()))
        }
    }

    fn to_api_host(&self) -> String {
        match self {
            Self::Enterprise(host) => host.clone(),
            Self::Standard(host) => format!("api.{host}"),
        }
    }

    fn to_api_url(&self) -> String {
        match self {
            Self::Enterprise(_) => format!("https://{host}/api/v3", host = self.to_api_host()),
            Self::Standard(_) => format!("https://{host}", host = self.to_api_host()),
        }
    }
}

impl Default for GitHubHost {
    fn default() -> Self {
        Self::Standard("github.com".into())
    }
}

impl Display for GitHubHost {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Enterprise(host) | Self::Standard(host) => write!(f, "{host}"),
        }
    }
}

impl FromStr for GitHubHost {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::new(s)
    }
}

#[derive(Clone)]
pub(crate) struct GitHubToken(String);

impl GitHubToken {
    pub(crate) fn new(token: &str) -> Result<Self, String> {
        let token = token.trim();
        if token.is_empty() {
            return Err("GitHub token cannot be empty".into());
        }
        Ok(Self(token.to_owned()))
    }

    fn bearer(&self) -> String {
        format!("Bearer {}", self.0)
    }

    fn basic(&self) -> String {
        let pair = format!("x-access-token:{}", self.0);
        format!(
            "Basic {}",
            base64::engine::general_purpose::STANDARD.encode(pair)
        )
    }
}

impl std::fmt::Debug for GitHubToken {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("GitHubToken").field(&"***").finish()
    }
}

#[derive(Debug, Error)]
pub(crate) enum ClientError {
    #[error("request error while accessing GitHub API")]
    Request(#[from] ureq::Error),

    #[error("GitHub API responded with {0}")]
    Status(StatusCode),

    #[error("GitHub API returned unexpected JSON")]
    Json(#[from] serde_json::Error),

    #[error("error while processing Git pkt-lines")]
    PktLint(#[from] pktline::PktLineError),

    #[error("error while listing Git references")]
    ListRefs(#[from] lineref::LineRefError),

    #[error("couldn't list branches for {owner}/{repo}")]
    ListBranches {
        #[source]
        source: Box<Self>,
        owner: String,
        repo: String,
    },

    #[error("couldn't list tags for {owner}/{repo}")]
    ListTags {
        #[source]
        source: Box<Self>,
        owner: String,
        repo: String,
    },

    #[error("can't access {owner}/{repo}: missing or you have no access")]
    RepoMissingOrPrivate { owner: String, repo: String },
}

#[derive(Clone)]
struct RemoteHead {
    name: String,
    oid: String,
}

pub(crate) enum Ref {
    Branch(Branch),
    Tag(Tag),
}

impl Ref {
    pub(crate) fn kind(&self) -> &'static str {
        match self {
            Self::Branch(_) => "branch",
            Self::Tag(_) => "tag",
        }
    }

    pub(crate) fn commit(&self) -> &str {
        match self {
            Self::Branch(branch) => &branch.commit.sha,
            Self::Tag(tag) => &tag.commit.sha,
        }
    }
}

struct Fetched {
    status: StatusCode,
    body: Vec<u8>,
}

#[derive(Clone)]
pub(crate) struct Client {
    api_base: String,
    web_base: String,
    token: GitHubToken,
    agent: Agent,
    ref_cache: Arc<Mutex<HashMap<String, Vec<RemoteHead>>>>,
    api_cache: Arc<Mutex<HashMap<String, Arc<Fetched>>>>,
}

fn retryable(status: StatusCode) -> bool {
    status.is_server_error()
        || matches!(
            status,
            StatusCode::REQUEST_TIMEOUT | StatusCode::TOO_MANY_REQUESTS
        )
}

fn fetched(response: Response<ureq::Body>) -> Result<Fetched, ClientError> {
    let status = response.status();
    let body = response.into_body().read_to_vec()?;
    Ok(Fetched { status, body })
}

fn decode<T: DeserializeOwned>(fetched: &Fetched) -> Result<T, ClientError> {
    Ok(serde_json::from_slice(&fetched.body)?)
}

impl Client {
    pub(crate) fn new(host: &GitHubHost, token: &GitHubToken) -> Self {
        Self::at(host.to_api_url(), format!("https://{host}"), token)
    }

    fn at(api_base: String, web_base: String, token: &GitHubToken) -> Self {
        let agent = Agent::config_builder()
            .user_agent(ZIZMOR_AGENT)
            .http_status_as_error(false)
            .tls_config(
                TlsConfig::builder()
                    .root_certs(RootCerts::PlatformVerifier)
                    .build(),
            )
            .build()
            .new_agent();

        Self {
            api_base,
            web_base,
            token: token.clone(),
            agent,
            ref_cache: Arc::default(),
            api_cache: Arc::default(),
        }
    }

    #[cfg(test)]
    pub(crate) fn local(base: &str) -> Self {
        Self::at(
            base.to_owned(),
            base.to_owned(),
            &GitHubToken::new("test-token").expect("test token is valid"),
        )
    }

    fn with_retries(
        send: impl Fn() -> Result<Response<ureq::Body>, ureq::Error>,
    ) -> Result<Fetched, ClientError> {
        let mut attempt = 0;
        loop {
            let response = fetched(send()?)?;
            attempt += 1;
            if attempt > RETRIES || !retryable(response.status) {
                return Ok(response);
            }
        }
    }

    fn api_get(&self, url: &str, query: &[(&str, &str)]) -> Result<Arc<Fetched>, ClientError> {
        let key = query.iter().fold(url.to_owned(), |key, (name, value)| {
            format!("{key}\u{0}{name}={value}")
        });
        if let Some(hit) = self
            .api_cache
            .lock()
            .expect("GitHub cache poisoned")
            .get(&key)
        {
            return Ok(Arc::clone(hit));
        }
        let response = Arc::new(Self::with_retries(|| {
            query
                .iter()
                .fold(self.agent.get(url), |request, (name, value)| {
                    request.query(*name, *value)
                })
                .header("Authorization", self.token.bearer())
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("Accept", "application/vnd.github+json")
                .call()
        })?);
        self.api_cache
            .lock()
            .expect("GitHub cache poisoned")
            .insert(key, Arc::clone(&response));
        Ok(response)
    }

    fn list_refs(&self, slug: &Slug<'_>) -> Result<Vec<RemoteHead>, ClientError> {
        let url = format!(
            "{web_base}/{slug}.git/git-upload-pack",
            web_base = self.web_base
        );

        if let Some(heads) = self
            .ref_cache
            .lock()
            .expect("GitHub cache poisoned")
            .get(&url)
        {
            return Ok(heads.clone());
        }

        let mut req = vec![];
        pktline::Packet::data(b"command=ls-refs\n")?.encode(&mut req);
        pktline::Packet::data(format!("agent={ZIZMOR_AGENT}\n").as_bytes())?.encode(&mut req);
        pktline::Packet::Delim.encode(&mut req);
        pktline::Packet::data(b"peel\n")?.encode(&mut req);
        pktline::Packet::data(b"ref-prefix refs/heads/\n")?.encode(&mut req);
        pktline::Packet::data(b"ref-prefix refs/tags/\n")?.encode(&mut req);
        pktline::Packet::Flush.encode(&mut req);

        let resp = Self::with_retries(|| {
            self.agent
                .post(&url)
                .header("Git-Protocol", "version=2")
                .header("Authorization", self.token.basic())
                .send(&req[..])
        })?;

        if resp.status == StatusCode::NOT_FOUND {
            return Err(ClientError::RepoMissingOrPrivate {
                owner: slug.owner().to_string(),
                repo: slug.repo().to_string(),
            });
        }
        if !resp.status.is_success() {
            return Err(ClientError::Status(resp.status));
        }

        let mut remote_refs = vec![];
        for line_ref in lineref::LineRefIterator::new(&resp.body) {
            let line_ref = line_ref?;
            remote_refs.push(RemoteHead {
                name: line_ref.ref_name.to_string(),
                oid: line_ref
                    .peeled_obj_id
                    .unwrap_or(line_ref.obj_id)
                    .to_string(),
            });
        }

        self.ref_cache
            .lock()
            .expect("GitHub cache poisoned")
            .insert(url, remote_refs.clone());
        Ok(remote_refs)
    }

    fn list_branches_internal(&self, slug: &Slug<'_>) -> Result<Vec<Branch>, ClientError> {
        self.list_refs(slug)
            .map(|v| {
                v.iter()
                    .filter_map(|r| {
                        r.name.strip_prefix("refs/heads/").map(|name| Branch {
                            name: name.to_string(),
                            commit: Commit { sha: r.oid.clone() },
                        })
                    })
                    .collect()
            })
            .map_err(|e| ClientError::ListBranches {
                source: e.into(),
                owner: slug.owner().to_string(),
                repo: slug.repo().to_string(),
            })
    }

    #[instrument(skip(self))]
    pub(crate) fn list_branches(&self, slug: &Slug<'_>) -> Result<Vec<Branch>, ClientError> {
        self.list_branches_internal(slug)
    }

    fn list_tags_internal(&self, slug: &Slug<'_>) -> Result<Vec<Tag>, ClientError> {
        self.list_refs(slug)
            .map(|v| {
                let mut tags: Vec<_> = v
                    .iter()
                    .filter_map(|r| {
                        r.name.strip_prefix("refs/tags/").map(|name| Tag {
                            name: name.to_string(),
                            commit: Commit { sha: r.oid.clone() },
                        })
                    })
                    .collect();

                let annotated_tags: HashSet<_> = tags
                    .iter()
                    .filter_map(|tag| tag.name.strip_suffix("^{}").map(ToString::to_string))
                    .collect();
                tags.retain_mut(|tag| {
                    if let Some(stripped_name) = tag.name.strip_suffix("^{}") {
                        tag.name = stripped_name.to_string();
                        true
                    } else {
                        !annotated_tags.contains(&tag.name)
                    }
                });

                tags
            })
            .map_err(|e| ClientError::ListTags {
                source: e.into(),
                owner: slug.owner().to_string(),
                repo: slug.repo().to_string(),
            })
    }

    #[instrument(skip(self))]
    pub(crate) fn list_tags(&self, slug: &Slug<'_>) -> Result<Vec<Tag>, ClientError> {
        self.list_tags_internal(slug)
    }

    #[instrument(skip(self))]
    pub(crate) fn has_branch(&self, slug: &Slug<'_>, branch: &str) -> Result<bool, ClientError> {
        Ok(self
            .list_branches_internal(slug)?
            .iter()
            .any(|branch_ref| branch_ref.name == branch))
    }

    #[instrument(skip(self))]
    pub(crate) fn has_tag(&self, slug: &Slug<'_>, tag: &str) -> Result<bool, ClientError> {
        Ok(self
            .list_tags_internal(slug)?
            .iter()
            .any(|tag_ref| tag_ref.name == tag))
    }

    #[instrument(skip(self))]
    pub(crate) fn lookup_ref(
        &self,
        slug: &Slug<'_>,
        git_ref: &str,
    ) -> Result<Option<Ref>, ClientError> {
        let branches = self.list_branches_internal(slug)?;
        let tags = self.list_tags_internal(slug)?;

        if let Some(branch) = branches.into_iter().find(|branch| branch.name == git_ref) {
            return Ok(Some(Ref::Branch(branch)));
        }

        Ok(tags
            .into_iter()
            .find(|tag| tag.name == git_ref)
            .map(Ref::Tag))
    }

    #[instrument(skip(self))]
    pub(crate) fn tag_sha_to_commit_sha(
        &self,
        slug: &Slug<'_>,
        maybe_tag_sha: &str,
    ) -> Result<Option<String>, ClientError> {
        #[derive(Deserialize)]
        struct TagLookup {
            object: TagReferent,
        }

        #[derive(Deserialize)]
        struct TagReferent {
            sha: String,
            r#type: ReferentType,
        }

        #[derive(Deserialize)]
        #[serde(rename_all = "lowercase")]
        enum ReferentType {
            Commit,
            Tag,
        }

        let mut next_tag_sha = maybe_tag_sha.to_string();
        loop {
            let url = format!(
                "{api_base}/repos/{slug}/git/tags/{next_tag_sha}",
                api_base = self.api_base,
            );

            let resp = self.api_get(&url, &[])?;
            if resp.status == StatusCode::NOT_FOUND {
                return Ok(None);
            }
            if !resp.status.is_success() {
                return Err(ClientError::Status(resp.status));
            }
            let lookup: TagLookup = decode(&resp)?;
            match lookup.object.r#type {
                ReferentType::Commit => return Ok(Some(lookup.object.sha)),
                ReferentType::Tag => next_tag_sha = lookup.object.sha,
            }
        }
    }

    #[instrument(skip(self))]
    pub(crate) fn longest_tag_for_commit(
        &self,
        slug: &Slug<'_>,
        subpath: Option<&str>,
        commit: &str,
    ) -> Result<Option<Tag>, ClientError> {
        let tags = self.list_tags(slug)?;

        Ok(best_tag_for_commit(tags, subpath, commit))
    }

    #[instrument(skip(self))]
    pub(crate) fn branch_commits(
        &self,
        slug: &Slug<'_>,
        commit: &str,
    ) -> Result<BranchCommits, ClientError> {
        let url = format!(
            "{web_base}/{slug}/branch_commits/{commit}",
            web_base = self.web_base
        );

        let resp = Self::with_retries(|| {
            self.agent
                .get(&url)
                .header("Accept", "application/json")
                .call()
        })?;
        if !resp.status.is_success() {
            return Err(ClientError::Status(resp.status));
        }
        decode(&resp)
    }

    #[instrument(skip(self))]
    pub(crate) fn repo_exists(&self, slug: &Slug<'_>) -> Result<bool, ClientError> {
        match self.list_refs(slug) {
            Ok(_) => Ok(true),
            Err(ClientError::RepoMissingOrPrivate { .. }) => Ok(false),
            Err(e) => Err(e),
        }
    }

    #[instrument(skip(self))]
    pub(crate) fn compare_commits(
        &self,
        slug: &Slug<'_>,
        base: &str,
        head: &str,
    ) -> Result<Option<ComparisonStatus>, ClientError> {
        let url = format!(
            "{api_base}/repos/{slug}/compare/{base}...{head}",
            api_base = self.api_base
        );

        let resp = self.api_get(&url, &[])?;
        if resp.status == StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !resp.status.is_success() {
            return Err(ClientError::Status(resp.status));
        }
        let comparison: Comparison = decode(&resp)?;
        Ok(Some(comparison.status))
    }

    #[instrument(skip(self))]
    pub(crate) fn gha_advisories(
        &self,
        slug: &Slug<'_>,
        version: &str,
    ) -> Result<Vec<Advisory>, ClientError> {
        let url = format!("{api_base}/advisories", api_base = self.api_base);
        let affects = format!("{slug}@{version}");

        let resp = self.api_get(&url, &[("ecosystem", "actions"), ("affects", &affects)])?;
        if !resp.status.is_success() {
            return Err(ClientError::Status(resp.status));
        }
        decode(&resp)
    }
}

#[derive(Clone)]
pub(crate) struct Branch {
    pub(crate) name: String,
    pub(crate) commit: Commit,
}

#[derive(Clone)]
pub(crate) struct Tag {
    pub(crate) name: String,
    pub(crate) commit: Commit,
}

fn best_tag_for_commit(tags: Vec<Tag>, subpath: Option<&str>, commit: &str) -> Option<Tag> {
    let preferred_prefixes = subpath.map(|subpath| {
        let leaf = subpath.rsplit_once('/').map_or(subpath, |(_, leaf)| leaf);
        [subpath, leaf]
    });

    tags.into_iter()
        .filter(|tag| tag.commit.sha == commit)
        .max_by_key(|tag| {
            let is_preferred = match preferred_prefixes.as_ref() {
                Some(prefixes) => prefixes.iter().any(|prefix| {
                    tag.name
                        .strip_prefix(prefix)
                        .is_some_and(|suffix| suffix.starts_with('/'))
                }),

                None => !tag.name.contains('/'),
            };

            (is_preferred, tag.name.len())
        })
}

#[derive(Clone)]
pub(crate) struct Commit {
    pub(crate) sha: String,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
#[non_exhaustive]
pub(crate) struct BranchCommits {
    branches: Vec<serde_json::Value>,
    tags: Vec<String>,
}

impl BranchCommits {
    pub(crate) fn is_empty(&self) -> bool {
        self.branches.is_empty() && self.tags.is_empty()
    }
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ComparisonStatus {
    Ahead,
    Behind,
    Diverged,
    Identical,
}

#[derive(Deserialize)]
pub(crate) struct Comparison {
    pub(crate) status: ComparisonStatus,
}

#[derive(Debug, Deserialize)]
pub(crate) struct Advisory {
    pub(crate) ghsa_id: String,
    pub(crate) severity: String,
}

#[cfg(test)]
mod tests {
    use super::{Commit, GitHubHost, GitHubToken, Tag, best_tag_for_commit};

    fn tags(names: &[(&str, &str)]) -> Vec<Tag> {
        names
            .iter()
            .map(|(name, sha)| Tag {
                name: (*name).into(),
                commit: Commit { sha: (*sha).into() },
            })
            .collect()
    }

    #[test]
    fn test_best_tag_for_commit() {
        let monorepo = [
            ("allowlist-check/v1", "abcd"),
            ("allowlist-check/v1.0.0", "abcd"),
            ("restore/v1", "abcd"),
            ("restore/v1.0.0", "abcd"),
            ("save/v1", "abcd"),
            ("save/v1.0.0", "abcd"),
        ];

        for (subpath, expected) in [
            (Some("stash/save"), "save/v1.0.0"),
            (Some("save"), "save/v1.0.0"),
            (Some("stash/restore"), "restore/v1.0.0"),
            (Some("restore"), "restore/v1.0.0"),
            (Some("allowlist-check"), "allowlist-check/v1.0.0"),
        ] {
            assert_eq!(
                best_tag_for_commit(tags(&monorepo), subpath, "abcd")
                    .unwrap()
                    .name,
                expected
            );
        }

        assert_eq!(
            best_tag_for_commit(tags(&monorepo), Some("pelican"), "abcd")
                .unwrap()
                .name,
            "allowlist-check/v1.0.0"
        );

        let plain = [("v1", "abcd"), ("v1.2.3", "abcd"), ("v2.0.0", "beef")];
        assert_eq!(
            best_tag_for_commit(tags(&plain), None, "abcd")
                .unwrap()
                .name,
            "v1.2.3"
        );
        assert_eq!(
            best_tag_for_commit(tags(&plain), Some("sub"), "abcd")
                .unwrap()
                .name,
            "v1.2.3"
        );

        let mixed = [("v1.0.0", "abcd"), ("some-action/v1.0.0", "abcd")];
        assert_eq!(
            best_tag_for_commit(tags(&mixed), None, "abcd")
                .unwrap()
                .name,
            "v1.0.0"
        );

        assert!(best_tag_for_commit(tags(&plain), None, "dead").is_none());
    }

    #[test]
    fn test_github_host() {
        for (host, expected) in [
            ("github.com", "https://api.github.com"),
            ("something.ghe.com", "https://api.something.ghe.com"),
            (
                "selfhosted.example.com",
                "https://selfhosted.example.com/api/v3",
            ),
        ] {
            assert_eq!(GitHubHost::new(host).unwrap().to_api_url(), expected);
        }
    }

    #[test]
    fn test_github_token() {
        for (token, expected) in [
            ("gha_testtest\n", "gha_testtest"),
            ("  gha_testtest  ", "gha_testtest"),
            ("gho_testtest", "gho_testtest"),
            ("gho_test\ntest", "gho_test\ntest"),
        ] {
            assert_eq!(GitHubToken::new(token).unwrap().0, expected);
        }
        assert_eq!(
            format!("{:?}", GitHubToken::new("hackme").unwrap()),
            r#"GitHubToken("***")"#
        );
    }

    #[test]
    fn test_github_token_err() {
        for token in ["", " ", "\r", "\n", "\t", "     "] {
            assert!(GitHubToken::new(token).is_err());
        }
    }
}

use crate::features::audit_workflow::{
    AuditOptions,
    github::{Client, GitHubHost, GitHubToken},
};

#[derive(Default)]
pub(crate) struct AuditState {
    pub(crate) no_online_audits: bool,
    pub(crate) gh_client: Option<Client>,
}

impl AuditState {
    pub(crate) fn new(options: &AuditOptions) -> Result<Self, String> {
        let Some(token) = options.github_token.as_deref() else {
            return Ok(Self {
                no_online_audits: true,
                gh_client: None,
            });
        };
        let host = options
            .github_host
            .as_deref()
            .map_or_else(|| Ok(GitHubHost::default()), GitHubHost::new)?;
        Ok(Self {
            no_online_audits: false,
            gh_client: Some(Client::new(&host, &GitHubToken::new(token)?)),
        })
    }
}

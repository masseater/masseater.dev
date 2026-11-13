use std::future::Future;
use std::pin::Pin;
use std::sync::LazyLock;

use oauth2::basic::{BasicClient, BasicErrorResponseType};
use oauth2::{
    AsyncHttpClient, AuthUrl, AuthorizationCode, ClientId, CsrfToken, EndpointNotSet, EndpointSet,
    HttpRequest, HttpResponse, PkceCodeChallenge, PkceCodeVerifier, RedirectUrl, RefreshToken,
    RequestTokenError, TokenResponse, TokenUrl,
};
use regex::Regex;
use reqwest::Client;
use serde::Deserialize;
use serde_json::json;

use crate::failure::{Failure, Outcome};
use crate::store::Store;

use super::documents::SYNC_ORIGIN;
use super::state::{self, Key};

pub const CALLBACK_PATH: &str = "/oauth/callback";
const CLIENT_NAME: &str = "余白";

static ACCESS_ISSUER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^https://[a-z0-9-]+\.cloudflareaccess\.com/?$")
        .unwrap_or_else(|error| panic!("{error}"))
});

type Oauth = BasicClient<EndpointSet, EndpointNotSet, EndpointNotSet, EndpointNotSet, EndpointSet>;

pub struct SyncProblem {
    pub message: String,
    pub signed_out: bool,
}

impl From<Failure> for SyncProblem {
    fn from(failure: Failure) -> Self {
        Self {
            message: failure.message,
            signed_out: false,
        }
    }
}

pub struct Issued {
    pub access_token: String,
    pub expires_in: Option<std::time::Duration>,
}

pub struct Login {
    pub state: String,
    pub verifier: String,
}

#[derive(Deserialize)]
struct ProtectedResource {
    #[serde(default)]
    authorization_servers: Vec<String>,
}

#[derive(Deserialize)]
struct ServerMetadata {
    #[serde(rename = "authorization_endpoint")]
    authorization: String,
    #[serde(rename = "token_endpoint")]
    token: String,
    #[serde(rename = "registration_endpoint")]
    registration: Option<String>,
}

#[derive(Deserialize)]
struct Registered {
    client_id: String,
}

fn redirect_uri(port: u16) -> String {
    format!("http://127.0.0.1:{port}{CALLBACK_PATH}")
}

async fn issuer(http: &Client) -> Outcome<String> {
    let metadata: ProtectedResource = http
        .get(format!(
            "{SYNC_ORIGIN}/.well-known/oauth-protected-resource"
        ))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    metadata
        .authorization_servers
        .into_iter()
        .find(|server| ACCESS_ISSUER.is_match(server))
        .map(|server| server.trim_end_matches('/').to_owned())
        .ok_or_else(|| {
            Failure::new(format!(
                "{SYNC_ORIGIN} names no Access authorization server"
            ))
        })
}

async fn discover(http: &Client) -> Outcome<ServerMetadata> {
    let issuer = issuer(http).await?;
    Ok(http
        .get(format!("{issuer}/.well-known/oauth-authorization-server"))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?)
}

async fn register(
    http: &Client,
    store: &Store,
    server: &ServerMetadata,
    port: u16,
) -> Outcome<String> {
    let endpoint = server
        .registration
        .as_deref()
        .ok_or_else(|| Failure::new("the authorization server does not register clients"))?;
    let registered: Registered = http
        .post(endpoint)
        .json(&json!({
            "client_name": CLIENT_NAME,
            "redirect_uris": [redirect_uri(port)],
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
            "token_endpoint_auth_method": "none",
        }))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    store.with(|connection| state::write(connection, Key::ClientId, &registered.client_id))?;
    Ok(registered.client_id)
}

fn invalid_url(error: impl std::fmt::Display) -> Failure {
    Failure::new(error.to_string())
}

async fn connection(http: &Client, store: &Store, port: u16) -> Outcome<Oauth> {
    let server = discover(http).await?;
    let known = store.with(|connection| state::read(connection, Key::ClientId))?;
    let client_id = match known {
        Some(client_id) => client_id,
        None => register(http, store, &server, port).await?,
    };
    Ok(BasicClient::new(ClientId::new(client_id))
        .set_auth_uri(AuthUrl::new(server.authorization).map_err(invalid_url)?)
        .set_token_uri(TokenUrl::new(server.token).map_err(invalid_url)?)
        .set_redirect_uri(RedirectUrl::new(redirect_uri(port)).map_err(invalid_url)?))
}

struct Http(Client);

impl<'c> AsyncHttpClient<'c> for Http {
    type Error = reqwest::Error;
    type Future = Pin<Box<dyn Future<Output = Result<HttpResponse, Self::Error>> + Send + 'c>>;

    fn call(&'c self, request: HttpRequest) -> Self::Future {
        Box::pin(send(self.0.clone(), request))
    }
}

async fn send(http: Client, request: HttpRequest) -> Result<HttpResponse, reqwest::Error> {
    let response = http.execute(reqwest::Request::try_from(request)?).await?;
    let mut builder = oauth2::http::Response::builder().status(response.status());
    for (name, value) in response.headers() {
        builder = builder.header(name, value);
    }
    let body = response.bytes().await?.to_vec();
    Ok(builder.body(body).unwrap_or_default())
}

pub async fn authorization_request(
    http: &Client,
    store: &Store,
    port: u16,
) -> Outcome<(String, Login)> {
    let client = connection(http, store, port).await?;
    let (challenge, verifier) = PkceCodeChallenge::new_random_sha256();
    let (url, state) = client
        .authorize_url(CsrfToken::new_random)
        .set_pkce_challenge(challenge)
        .add_extra_param("resource", SYNC_ORIGIN)
        .url();
    let login = Login {
        state: state.secret().clone(),
        verifier: verifier.secret().clone(),
    };
    Ok((url.to_string(), login))
}

fn issued_from(store: &Store, token: &impl TokenResponse) -> Outcome<Issued> {
    if let Some(refresh) = token.refresh_token() {
        store.with(|connection| state::write(connection, Key::RefreshToken, refresh.secret()))?;
    }
    Ok(Issued {
        access_token: token.access_token().secret().clone(),
        expires_in: token.expires_in(),
    })
}

fn code_of(callback: &str, expected_state: &str) -> Outcome<String> {
    let url = url::Url::parse(callback).map_err(invalid_url)?;
    let query = |name: &str| {
        url.query_pairs()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.into_owned())
    };
    if let Some(error) = query("error") {
        return Err(Failure::new(error));
    }
    if query("state").as_deref() != Some(expected_state) {
        return Err(Failure::new("the sign-in state does not match"));
    }
    query("code").ok_or_else(|| Failure::new("the sign-in returned no code"))
}

pub async fn exchange_code(
    http: &Client,
    store: &Store,
    port: u16,
    callback: &str,
    login: Login,
) -> Outcome<Issued> {
    let code = code_of(callback, &login.state)?;
    let client = connection(http, store, port).await?;
    let token = client
        .exchange_code(AuthorizationCode::new(code))
        .set_pkce_verifier(PkceCodeVerifier::new(login.verifier))
        .add_extra_param("resource", SYNC_ORIGIN)
        .request_async(&Http(http.clone()))
        .await
        .map_err(|error| Failure::new(error.to_string()))?;
    issued_from(store, &token)
}

pub async fn refresh(
    http: &Client,
    store: &Store,
    port: u16,
    refresh_token: String,
) -> Result<Issued, SyncProblem> {
    let client = connection(http, store, port).await?;
    let token = client
        .exchange_refresh_token(&RefreshToken::new(refresh_token))
        .add_extra_param("resource", SYNC_ORIGIN)
        .request_async(&Http(http.clone()))
        .await
        .map_err(|error| {
            let signed_out = matches!(
                &error,
                RequestTokenError::ServerResponse(response)
                    if *response.error() == BasicErrorResponseType::InvalidGrant
            );
            SyncProblem {
                message: error.to_string(),
                signed_out,
            }
        })?;
    Ok(issued_from(store, &token)?)
}

#[cfg(test)]
mod tests {
    use super::{ACCESS_ISSUER, code_of};

    #[test]
    fn accepts_only_cloudflare_access_issuers() {
        assert!(ACCESS_ISSUER.is_match("https://masseater.cloudflareaccess.com"));
        assert!(!ACCESS_ISSUER.is_match("https://evil.example.com"));
    }

    #[test]
    fn reads_the_code_only_when_the_state_matches() {
        let callback = "http://127.0.0.1:47210/oauth/callback?code=abc&state=s1";
        assert_eq!(code_of(callback, "s1").ok().as_deref(), Some("abc"));
        assert!(code_of(callback, "other").is_err());
    }
}

use std::sync::{Arc, Mutex, PoisonError};
use std::time::Duration;

use reqwest::Client;
use tauri::async_runtime;

use crate::failure::{Failure, Outcome};
use crate::model::SyncStatus;
use crate::store::{Store, now};

use super::apply::apply_remote;
use super::auth::{self, Issued, Login, SyncProblem};
use super::outbox::{mark_pushed, pending_count, pending_documents};
use super::remote::{fetch_changes, push_documents};
use super::state::{self, Key};

const INTERVAL: Duration = Duration::from_secs(20);
const REFRESH_MARGIN: i64 = 60_000;
const PUSH_BATCH: usize = 50;
const MILLISECONDS: i64 = 1000;

#[derive(Clone)]
struct Grant {
    access_token: String,
    expires_at: i64,
}

#[derive(Default)]
struct Progress {
    synced_at: Option<i64>,
    problem: Option<String>,
}

#[derive(Default)]
struct Shared {
    grant: Option<Grant>,
    login: Option<Login>,
    progress: Progress,
}

#[derive(Clone)]
pub struct Syncer {
    store: Store,
    http: Client,
    port: u16,
    shared: Arc<Mutex<Shared>>,
    round: Arc<tokio::sync::Mutex<()>>,
}

fn grant_of(issued: Issued) -> Grant {
    let lifetime = issued
        .expires_in
        .map_or(0, |lifetime| i64::try_from(lifetime.as_secs()).unwrap_or(0));
    Grant {
        access_token: issued.access_token,
        expires_at: now() + lifetime * MILLISECONDS,
    }
}

impl Syncer {
    pub fn new(store: Store, port: u16) -> Outcome<Self> {
        let http = Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .build()?;
        Ok(Self {
            store,
            http,
            port,
            shared: Arc::default(),
            round: Arc::default(),
        })
    }

    fn shared<T>(&self, work: impl FnOnce(&mut Shared) -> T) -> T {
        work(&mut self.shared.lock().unwrap_or_else(PoisonError::into_inner))
    }

    pub fn start(&self) {
        let syncer = self.clone();
        async_runtime::spawn(async move {
            loop {
                syncer.sync_once().await;
                tokio::time::sleep(INTERVAL).await;
            }
        });
    }

    async fn access_token(&self) -> Result<Option<String>, SyncProblem> {
        let fresh = self.shared(|shared| {
            shared
                .grant
                .clone()
                .filter(|grant| grant.expires_at - now() > REFRESH_MARGIN)
        });
        if let Some(grant) = fresh {
            return Ok(Some(grant.access_token));
        }
        let stored = self
            .store
            .with(|connection| state::read(connection, Key::RefreshToken))?;
        let Some(refresh_token) = stored else {
            return Ok(None);
        };
        let grant =
            grant_of(auth::refresh(&self.http, &self.store, self.port, refresh_token).await?);
        let token = grant.access_token.clone();
        self.shared(|shared| shared.grant = Some(grant));
        Ok(Some(token))
    }

    async fn push(&self, access_token: &str) -> Outcome<()> {
        let pending = self
            .store
            .with(|connection| pending_documents(connection))?;
        for batch in pending.chunks(PUSH_BATCH) {
            let documents: Vec<_> = batch
                .iter()
                .map(|pending| pending.document.clone())
                .collect();
            push_documents(&self.http, access_token, &documents).await?;
            let entries: Vec<_> = batch.iter().map(|pending| pending.entry.clone()).collect();
            self.store
                .with(|connection| mark_pushed(connection, &entries))?;
        }
        Ok(())
    }

    async fn pull(&self, access_token: &str) -> Outcome<()> {
        let cursor = self
            .store
            .with(|connection| state::read(connection, Key::Cursor))?;
        let mut after = cursor.and_then(|value| value.parse().ok()).unwrap_or(0);
        loop {
            let changes = fetch_changes(&self.http, access_token, after).await?;
            self.store
                .try_with(|connection| apply_remote(connection, &changes.documents))?;
            after = changes
                .documents
                .last()
                .map_or(after, |stored| stored.revision);
            self.store
                .with(|connection| state::write(connection, Key::Cursor, &after.to_string()))?;
            if !changes.more {
                return Ok(());
            }
        }
    }

    async fn round(&self) -> Result<(), SyncProblem> {
        let Some(token) = self.access_token().await? else {
            return Ok(());
        };
        self.push(&token).await?;
        self.pull(&token).await?;
        self.shared(|shared| {
            shared.progress = Progress {
                synced_at: Some(now()),
                problem: None,
            };
        });
        Ok(())
    }

    fn record(&self, problem: SyncProblem) {
        if problem.signed_out {
            self.shared(|shared| shared.grant = None);
            let _ = self
                .store
                .with(|connection| state::clear(connection, Key::RefreshToken));
        }
        eprintln!("sync failed: {}", problem.message);
        self.shared(|shared| shared.progress.problem = Some(problem.message));
    }

    async fn sync_once(&self) {
        let _round = self.round.lock().await;
        if let Err(problem) = self.round().await {
            self.record(problem);
        }
    }

    pub fn status(&self) -> Outcome<SyncStatus> {
        let refresh_token = self
            .store
            .with(|connection| state::read(connection, Key::RefreshToken))?;
        let pending = self.store.with(|connection| pending_count(connection))?;
        Ok(self.shared(|shared| SyncStatus {
            connected: refresh_token.is_some(),
            synced_at: shared.progress.synced_at,
            pending,
            problem: shared.progress.problem.clone(),
        }))
    }

    pub async fn sign_in(&self) -> Outcome<String> {
        let (url, login) = auth::authorization_request(&self.http, &self.store, self.port).await?;
        self.shared(|shared| shared.login = Some(login));
        Ok(url)
    }

    pub async fn callback(&self, url: &str) -> Outcome<()> {
        let login = self
            .shared(|shared| shared.login.take())
            .ok_or_else(|| Failure::new("no sign-in is waiting"))?;
        let issued = auth::exchange_code(&self.http, &self.store, self.port, url, login).await?;
        let grant = grant_of(issued);
        self.shared(|shared| shared.grant = Some(grant));
        let syncer = self.clone();
        async_runtime::spawn(async move { syncer.sync_once().await });
        Ok(())
    }
}

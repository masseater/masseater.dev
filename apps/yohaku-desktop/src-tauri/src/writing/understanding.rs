use std::collections::HashMap;
use std::sync::{Arc, Mutex, PoisonError};
use std::time::Duration;

use tauri::async_runtime::{self, JoinHandle};

use crate::failure::Outcome;
use crate::model::{Classified, Paragraph, ParagraphKind};
use crate::store::{Store, manuscripts, sources};

use super::classify::classify;
use super::claude::Claude;
use super::draft::Context;
use super::ingest::extract_manuscript;

const SETTLE: Duration = Duration::from_secs(30);

pub struct Reading {
    pub kinds: Vec<Classified>,
    pub prose: Vec<Paragraph>,
}

pub async fn read(store: &Store, claude: &Claude, paragraphs: &[Paragraph]) -> Reading {
    let kinds = classify(store, claude, paragraphs)
        .await
        .unwrap_or_else(|failure| {
            eprintln!("classify failed: {failure}");
            Vec::new()
        });
    let kind_of: HashMap<&str, ParagraphKind> = kinds
        .iter()
        .map(|classified| (classified.paragraph_id.as_str(), classified.kind))
        .collect();
    let prose = paragraphs
        .iter()
        .filter(|paragraph| {
            kind_of
                .get(paragraph.id.as_str())
                .is_none_or(|kind| *kind == ParagraphKind::Prose)
        })
        .cloned()
        .collect();
    Reading { kinds, prose }
}

pub fn texts(paragraphs: &[Paragraph]) -> Vec<String> {
    paragraphs
        .iter()
        .map(|paragraph| paragraph.text.clone())
        .collect()
}

pub async fn context_for(store: &Store, claude: &Claude, id: &str) -> Outcome<Context> {
    let paragraphs = store.with(|connection| manuscripts::paragraphs(connection, id))?;
    let Reading { prose, .. } = read(store, claude, &paragraphs).await;
    let facts = store.with(|connection| sources::facts(connection))?;
    Ok(Context {
        paragraphs,
        prose: texts(&prose),
        facts,
    })
}

async fn extract_after_settling(store: Store, claude: Claude, id: String) {
    tokio::time::sleep(SETTLE).await;
    let extracted = async {
        let paragraphs = store.with(|connection| manuscripts::paragraphs(connection, &id))?;
        let Reading { prose, .. } = read(&store, &claude, &paragraphs).await;
        extract_manuscript(&store, &claude, &id, &texts(&prose)).await
    };
    if let Err(failure) = extracted.await {
        eprintln!("extract failed: {failure}");
    }
}

#[derive(Clone)]
pub struct Understanding {
    store: Store,
    claude: Claude,
    waiting: Arc<Mutex<HashMap<String, JoinHandle<()>>>>,
}

impl Understanding {
    pub fn new(store: Store, claude: Claude) -> Self {
        Self {
            store,
            claude,
            waiting: Arc::default(),
        }
    }

    pub fn changed(&self, id: &str) {
        let task = async_runtime::spawn(extract_after_settling(
            self.store.clone(),
            self.claude.clone(),
            id.to_owned(),
        ));
        let replaced = self
            .waiting
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .insert(id.to_owned(), task);
        if let Some(previous) = replaced {
            previous.abort();
        }
    }
}

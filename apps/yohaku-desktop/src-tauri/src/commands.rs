use tauri::State;
use tauri::ipc::Channel;

use crate::failure::{Failure, Outcome};
use crate::mcp;
use crate::model::{
    Annotations, ClaudeStatus, Fact, Manuscript, Mcp, OnboardingStep, Opened, Paragraph, Reaction,
    SignIn, Source, SyncStatus, Title, TitleAuthor,
};
use crate::store::{Store, dismissals, manuscripts, onboarding, reactions, sources};
use crate::sync::Syncer;
use crate::writing::claude::Claude;
use crate::writing::draft::{Rewrite, draft_from_memo as draft, rewrite_span};
use crate::writing::ingest::ingest_text as ingest;
use crate::writing::remarks::{remarks_of, without_dismissed};
use crate::writing::title::propose_title;
use crate::writing::understanding::{Reading, Understanding, context_for, read, texts};

pub struct Yohaku {
    pub store: Store,
    pub claude: Claude,
    pub understanding: Understanding,
    pub syncer: Syncer,
    pub mcp_token: String,
}

type Answer<T> = Result<T, Failure>;

fn found<T>(value: Option<T>) -> Outcome<T> {
    value.ok_or_else(Failure::not_found)
}

fn manuscript(store: &Store, id: &str) -> Outcome<Manuscript> {
    found(store.with(|connection| manuscripts::find(connection, id))?)
}

fn paragraph(store: &Store, id: &str, paragraph_id: &str) -> Outcome<Paragraph> {
    let paragraphs = store.with(|connection| manuscripts::paragraphs(connection, id))?;
    found(
        paragraphs
            .into_iter()
            .find(|paragraph| paragraph.id == paragraph_id),
    )
}

fn send(channel: &Channel<String>) -> impl FnMut(String) + '_ {
    move |text| {
        let _ = channel.send(text);
    }
}

#[tauri::command]
#[specta::specta]
pub async fn list_manuscripts(yohaku: State<'_, Yohaku>) -> Answer<Vec<Manuscript>> {
    yohaku
        .store
        .with(|connection| manuscripts::list(connection))
}

#[tauri::command]
#[specta::specta]
pub async fn create_manuscript(yohaku: State<'_, Yohaku>) -> Answer<Manuscript> {
    yohaku
        .store
        .with(|connection| manuscripts::create(connection))
}

#[tauri::command]
#[specta::specta]
pub async fn open_manuscript(yohaku: State<'_, Yohaku>, id: String) -> Answer<Opened> {
    let manuscript = manuscript(&yohaku.store, &id)?;
    let paragraphs = yohaku
        .store
        .with(|connection| manuscripts::paragraphs(connection, &id))?;
    Ok(Opened {
        manuscript,
        paragraphs,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn save_paragraphs(
    yohaku: State<'_, Yohaku>,
    id: String,
    paragraphs: Vec<Paragraph>,
) -> Answer<()> {
    manuscript(&yohaku.store, &id)?;
    yohaku
        .store
        .with(|connection| manuscripts::save(connection, &id, &paragraphs))?;
    yohaku.understanding.changed(&id);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn set_title(yohaku: State<'_, Yohaku>, id: String, text: String) -> Answer<Manuscript> {
    let trimmed = text.trim();
    let title = (!trimmed.is_empty()).then(|| Title {
        text: trimmed.to_owned(),
        by: TitleAuthor::Writer,
    });
    yohaku
        .store
        .with(|connection| manuscripts::set_title(connection, &id, title.as_ref()))?;
    manuscript(&yohaku.store, &id)
}

async fn titled(yohaku: &Yohaku, current: Manuscript, prose: &[String]) -> Outcome<Option<Title>> {
    if current.title.is_some() {
        return Ok(current.title);
    }
    let proposed = propose_title(&yohaku.claude, prose)
        .await
        .unwrap_or_else(|failure| {
            eprintln!("title failed: {failure}");
            String::new()
        });
    if proposed.is_empty() {
        return Ok(None);
    }
    let title = Title {
        text: proposed,
        by: TitleAuthor::Ai,
    };
    yohaku
        .store
        .with(|connection| manuscripts::set_title(connection, &current.id, Some(&title)))?;
    Ok(Some(title))
}

#[tauri::command]
#[specta::specta]
pub async fn get_annotations(yohaku: State<'_, Yohaku>, id: String) -> Answer<Annotations> {
    let current = manuscript(&yohaku.store, &id)?;
    let paragraphs = yohaku
        .store
        .with(|connection| manuscripts::paragraphs(connection, &id))?;
    let Reading { kinds, prose } = read(&yohaku.store, &yohaku.claude, &paragraphs).await;
    let dismissed = yohaku
        .store
        .with(|connection| dismissals::all(connection))?;
    let text_of = |paragraph_id: &str| {
        paragraphs
            .iter()
            .find(|paragraph| paragraph.id == paragraph_id)
            .map(|paragraph| paragraph.text.clone())
            .unwrap_or_default()
    };
    let remarks = without_dismissed(remarks_of(&prose), &dismissed, text_of);
    let title = titled(&yohaku, current, &texts(&prose)).await?;
    Ok(Annotations {
        title,
        kinds,
        remarks,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn draft_from_memo(
    yohaku: State<'_, Yohaku>,
    id: String,
    paragraph_id: String,
    on_text: Channel<String>,
) -> Answer<()> {
    let context = context_for(&yohaku.store, &yohaku.claude, &id).await?;
    let memo = paragraph(&yohaku.store, &id, &paragraph_id)?;
    draft(&yohaku.claude, &context, &memo, send(&on_text)).await
}

#[tauri::command]
#[specta::specta]
pub async fn rewrite_remark(
    yohaku: State<'_, Yohaku>,
    id: String,
    paragraph_id: String,
    from: u32,
    to: u32,
    rule: String,
    on_text: Channel<String>,
) -> Answer<()> {
    let context = context_for(&yohaku.store, &yohaku.claude, &id).await?;
    let target = paragraph(&yohaku.store, &id, &paragraph_id)?;
    let problem = remarks_of(std::slice::from_ref(&target))
        .into_iter()
        .find(|remark| remark.rule == rule)
        .map_or_else(|| rule.clone(), |remark| remark.message);
    let rewrite = Rewrite {
        paragraph: &target,
        from: from as usize,
        to: to as usize,
        problem: &problem,
    };
    rewrite_span(&yohaku.claude, &context, &rewrite, send(&on_text)).await
}

#[tauri::command]
#[specta::specta]
pub async fn dismiss_remark(
    yohaku: State<'_, Yohaku>,
    id: String,
    paragraph_id: String,
    rule: String,
) -> Answer<()> {
    let target = paragraph(&yohaku.store, &id, &paragraph_id)?;
    yohaku.store.with(|connection| {
        dismissals::dismiss(connection, &target.text, &rule)?;
        reactions::log(connection, Reaction::RemarkDismissed)
    })
}

#[tauri::command]
#[specta::specta]
pub async fn log_reaction(yohaku: State<'_, Yohaku>, reaction: Reaction) -> Answer<()> {
    yohaku
        .store
        .with(|connection| reactions::log(connection, reaction))
}

#[tauri::command]
#[specta::specta]
pub async fn list_sources(yohaku: State<'_, Yohaku>) -> Answer<Vec<Source>> {
    yohaku.store.with(|connection| sources::list(connection))
}

#[tauri::command]
#[specta::specta]
pub async fn ingest_text(yohaku: State<'_, Yohaku>, text: String) -> Answer<Source> {
    ingest(&yohaku.store, &yohaku.claude, &text).await
}

#[tauri::command]
#[specta::specta]
pub async fn revert_source(yohaku: State<'_, Yohaku>, id: String) -> Answer<()> {
    yohaku
        .store
        .with(|connection| sources::revert(connection, &id))
}

#[tauri::command]
#[specta::specta]
pub async fn get_mcp(yohaku: State<'_, Yohaku>) -> Answer<Mcp> {
    Ok(Mcp {
        url: mcp::url(),
        token: yohaku.mcp_token.clone(),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn sync_status(yohaku: State<'_, Yohaku>) -> Answer<SyncStatus> {
    yohaku.syncer.status()
}

#[tauri::command]
#[specta::specta]
pub async fn begin_sync_sign_in(yohaku: State<'_, Yohaku>) -> Answer<SignIn> {
    Ok(SignIn {
        url: yohaku.syncer.sign_in().await?,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn source_facts(yohaku: State<'_, Yohaku>, id: String) -> Answer<Vec<Fact>> {
    yohaku
        .store
        .with(|connection| sources::facts_of(connection, &id))
}

#[tauri::command]
#[specta::specta]
pub async fn claude_status(yohaku: State<'_, Yohaku>) -> Answer<ClaudeStatus> {
    Ok(yohaku.claude.status().await)
}

#[tauri::command]
#[specta::specta]
pub async fn onboarding_done(yohaku: State<'_, Yohaku>) -> Answer<Vec<OnboardingStep>> {
    yohaku.store.with(|connection| onboarding::done(connection))
}

#[tauri::command]
#[specta::specta]
pub async fn complete_onboarding_step(
    yohaku: State<'_, Yohaku>,
    step: OnboardingStep,
) -> Answer<()> {
    yohaku
        .store
        .with(|connection| onboarding::complete(connection, step))
}

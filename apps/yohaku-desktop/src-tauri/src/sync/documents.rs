use serde::{Deserialize, Serialize};

use crate::model::{Fact, Paragraph, SourceOrigin, Title};

pub const SYNC_ORIGIN: &str = "https://yohaku.masseater.dev";
pub const CHANGES_PATH: &str = "/api/changes";
pub const DOCUMENTS_PATH: &str = "/api/documents";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DocumentKind {
    Manuscript,
    Source,
}

impl DocumentKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Manuscript => "manuscript",
            Self::Source => "source",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "manuscript" => Some(Self::Manuscript),
            "source" => Some(Self::Source),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDocument {
    pub kind: DocumentKind,
    pub id: String,
    pub updated_at: i64,
    pub deleted: bool,
    pub body: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredDocument {
    #[serde(flatten)]
    pub document: SyncDocument,
    pub revision: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Changes {
    pub documents: Vec<StoredDocument>,
    pub more: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct Pushed<'a> {
    pub documents: &'a [SyncDocument],
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManuscriptBody {
    pub title: Option<Title>,
    pub created_at: i64,
    pub paragraphs: Vec<Paragraph>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceBody {
    pub manuscript_id: Option<String>,
    pub label: String,
    pub origin: SourceOrigin,
    pub client: String,
    pub created_at: i64,
    pub facts: Vec<Fact>,
}

#[cfg(test)]
mod tests {
    use super::{Changes, DocumentKind, ManuscriptBody, SourceBody};

    #[test]
    fn reads_the_changes_the_sync_worker_sends() {
        let changes: Changes = serde_json::from_str(
            r#"{"documents":[{"kind":"manuscript","id":"m","updatedAt":5,"deleted":false,"body":"{}","revision":7}],"more":false}"#,
        )
        .expect("changes");
        assert_eq!(changes.documents[0].revision, 7);
        assert_eq!(changes.documents[0].document.kind, DocumentKind::Manuscript);
    }

    #[test]
    fn writes_bodies_in_the_shape_other_devices_read() {
        let manuscript: ManuscriptBody = serde_json::from_str(
            r#"{"title":{"text":"雨","by":"ai"},"createdAt":1,"paragraphs":[{"id":"p","text":"雨"}]}"#,
        )
        .expect("manuscript");
        assert_eq!(
            serde_json::to_string(&manuscript).expect("encode"),
            r#"{"title":{"text":"雨","by":"ai"},"createdAt":1,"paragraphs":[{"id":"p","text":"雨"}]}"#
        );
        let source: SourceBody = serde_json::from_str(
            r#"{"manuscriptId":null,"label":"資料","origin":"mcp","client":"Claude Code","createdAt":2,"facts":[{"kind":"voice","subject":"A","body":"だよ","when":null}]}"#,
        )
        .expect("source");
        assert_eq!(source.facts.len(), 1);
    }
}

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum TitleAuthor {
    Writer,
    Ai,
}

impl TitleAuthor {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Writer => "writer",
            Self::Ai => "ai",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "writer" => Some(Self::Writer),
            "ai" => Some(Self::Ai),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct Title {
    pub text: String,
    pub by: TitleAuthor,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Manuscript {
    pub id: String,
    pub title: Option<Title>,
    pub excerpt: String,
    #[specta(type = specta_typescript::Number)]
    pub updated_at: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type, JsonSchema)]
pub struct Paragraph {
    pub id: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct Opened {
    pub manuscript: Manuscript,
    pub paragraphs: Vec<Paragraph>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Type, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum ParagraphKind {
    Prose,
    Memo,
    Idea,
}

impl ParagraphKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Prose => "prose",
            Self::Memo => "memo",
            Self::Idea => "idea",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "prose" => Some(Self::Prose),
            "memo" => Some(Self::Memo),
            "idea" => Some(Self::Idea),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Classified {
    pub paragraph_id: String,
    pub kind: ParagraphKind,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Remark {
    pub paragraph_id: String,
    pub from: u32,
    pub to: u32,
    pub rule: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct Annotations {
    pub title: Option<Title>,
    pub kinds: Vec<Classified>,
    pub remarks: Vec<Remark>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum FactKind {
    Character,
    Voice,
    Event,
    Knowledge,
    Setting,
    Idea,
}

impl FactKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Character => "character",
            Self::Voice => "voice",
            Self::Event => "event",
            Self::Knowledge => "knowledge",
            Self::Setting => "setting",
            Self::Idea => "idea",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        [
            Self::Character,
            Self::Voice,
            Self::Event,
            Self::Knowledge,
            Self::Setting,
            Self::Idea,
        ]
        .into_iter()
        .find(|kind| kind.as_str() == value)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type, JsonSchema)]
pub struct Fact {
    pub kind: FactKind,
    pub subject: String,
    pub body: String,
    pub when: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum SourceOrigin {
    Manuscript,
    Mcp,
    Agent,
}

impl SourceOrigin {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Manuscript => "manuscript",
            Self::Mcp => "mcp",
            Self::Agent => "agent",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "manuscript" => Some(Self::Manuscript),
            "mcp" => Some(Self::Mcp),
            "agent" => Some(Self::Agent),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Source {
    pub id: String,
    pub label: String,
    pub origin: SourceOrigin,
    pub client: String,
    pub facts: u32,
    #[specta(type = specta_typescript::Number)]
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum Reaction {
    DraftAccepted,
    DraftRewritten,
    DraftKept,
    RemarkDismissed,
    RemarkRewritten,
    QuestionDeferred,
}

impl Reaction {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::DraftAccepted => "draft-accepted",
            Self::DraftRewritten => "draft-rewritten",
            Self::DraftKept => "draft-kept",
            Self::RemarkDismissed => "remark-dismissed",
            Self::RemarkRewritten => "remark-rewritten",
            Self::QuestionDeferred => "question-deferred",
        }
    }
}

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub connected: bool,
    #[specta(type = Option<specta_typescript::Number>)]
    pub synced_at: Option<i64>,
    pub pending: u32,
    pub problem: Option<String>,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct Mcp {
    pub url: String,
    pub token: String,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct SignIn {
    pub url: String,
}

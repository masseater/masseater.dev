use serde::{Deserialize, Serialize};
use specta::Type;

use crate::protocol::{Manuscript, Paragraph};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Revision {
    pub id: String,
    #[specta(type = specta_typescript::Number)]
    pub saved_at: i64,
    pub excerpt: String,
    pub characters: u32,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct Opened {
    pub manuscript: Manuscript,
    pub paragraphs: Vec<Paragraph>,
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum OnboardingStep {
    Setup,
    IdeaHint,
    SourceHint,
}

impl OnboardingStep {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Setup => "setup",
            Self::IdeaHint => "idea-hint",
            Self::SourceHint => "source-hint",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        [Self::Setup, Self::IdeaHint, Self::SourceHint]
            .into_iter()
            .find(|step| step.as_str() == value)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeStatus {
    pub installed: bool,
    pub logged_in: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    pub version: String,
}

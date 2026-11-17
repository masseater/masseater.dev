use std::collections::BTreeMap;

use serde::Deserialize;

use crate::shared::diagnostic::Severity;

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    #[serde(default)]
    pub kinds: Vec<Kind>,
    #[serde(default)]
    pub rules: BTreeMap<String, Setting>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Setting {
    Off,
    Warn,
    Error,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Kind {
    pub name: String,
    pub marker: String,
    #[serde(default)]
    pub paths: Option<Vec<String>>,
    #[serde(default)]
    pub placements: Vec<Placement>,
    #[serde(default)]
    pub layers: Option<Layers>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Placement {
    pub files: Vec<String>,
    pub allow: Vec<String>,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Layers {
    pub dir: String,
    pub files: Vec<String>,
    pub order: Vec<String>,
    #[serde(default)]
    pub sliced: Vec<String>,
    #[serde(default)]
    pub segmented: Vec<String>,
    #[serde(default)]
    pub loose: Vec<String>,
    #[serde(default)]
    pub entries: Vec<String>,
    #[serde(default)]
    pub open: Vec<String>,
    #[serde(default)]
    pub module_files: bool,
    #[serde(default)]
    pub cross: Option<String>,
}

impl Config {
    #[must_use]
    pub fn severity(&self, rule: &str) -> Option<Severity> {
        match self.rules.get(rule) {
            Some(Setting::Off) => None,
            Some(Setting::Warn) => Some(Severity::Warn),
            Some(Setting::Error) | None => Some(Severity::Error),
        }
    }
}

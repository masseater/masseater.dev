use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", tag = "type", content = "value")]
pub enum Target {
    File(String),
    Module(Vec<String>),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Edge {
    pub from: String,
    pub specifier: String,
    pub target: Target,
    pub line: usize,
    pub column: usize,
    pub wildcard: bool,
}

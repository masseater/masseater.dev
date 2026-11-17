use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Severity {
    Warn,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub path: String,
    pub line: usize,
    pub column: usize,
    pub rule: &'static str,
    pub message: String,
    pub severity: Severity,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Finding {
    pub path: String,
    pub line: usize,
    pub column: usize,
    pub rule: &'static str,
    pub message: String,
}

impl Finding {
    #[must_use]
    pub fn at_file(path: &str, rule: &'static str, message: String) -> Self {
        Self {
            path: path.to_owned(),
            line: 1,
            column: 1,
            rule,
            message,
        }
    }
}

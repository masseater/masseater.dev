#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Target {
    File(String),
    Module(Vec<String>),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Edge {
    pub from: String,
    pub specifier: String,
    pub target: Target,
    pub line: usize,
    pub column: usize,
    pub wildcard: bool,
}

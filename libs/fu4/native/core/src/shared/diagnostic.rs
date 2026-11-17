use crate::shared::yaml::Pos;

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Diagnostic {
    pub message: String,
    pub pos: Pos,
    pub kind: String,
}

impl Diagnostic {
    #[must_use]
    pub fn new(pos: Pos, kind: &str, message: String) -> Self {
        Self {
            message,
            pos,
            kind: kind.to_owned(),
        }
    }
}

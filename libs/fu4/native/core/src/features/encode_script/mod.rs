use tracing::info_span;
use tree_sitter::Language;

use crate::shared::concrete;
use crate::shared::transfer::Buffer;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScriptLanguage {
    Bash,
    PowerShell,
}

impl ScriptLanguage {
    #[must_use]
    pub fn from_name(name: &str) -> Option<Self> {
        match name {
            "bash" => Some(Self::Bash),
            "powershell" => Some(Self::PowerShell),
            _ => None,
        }
    }

    fn grammar(self) -> Language {
        match self {
            Self::Bash => tree_sitter_bash::LANGUAGE.into(),
            Self::PowerShell => tree_sitter_powershell::LANGUAGE.into(),
        }
    }
}

#[must_use]
pub fn encode_script(language: ScriptLanguage, text: &str) -> Vec<u8> {
    let _span = info_span!("fu4.encode_script", "fu4.bytes" = text.len()).entered();
    let mut buffer = Buffer::default();
    buffer.string(text);
    concrete::write(&mut buffer, &language.grammar(), text);
    buffer.finish()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shared::transfer::NONE;

    fn header(bytes: &[u8]) -> Vec<u32> {
        bytes[..32]
            .chunks_exact(4)
            .map(|chunk| u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
            .collect()
    }

    #[test]
    fn parses_bash_and_powershell_without_a_semantic_tree() {
        for language in [ScriptLanguage::Bash, ScriptLanguage::PowerShell] {
            let all = header(&encode_script(language, "echo hi\n"));
            assert_eq!(all[2], NONE);
            assert!(all[3] > 1);
            assert_eq!(all[4], 0);
        }
    }

    #[test]
    fn names_only_known_languages() {
        assert_eq!(ScriptLanguage::from_name("bash"), Some(ScriptLanguage::Bash));
        assert_eq!(ScriptLanguage::from_name("sh"), None);
    }
}

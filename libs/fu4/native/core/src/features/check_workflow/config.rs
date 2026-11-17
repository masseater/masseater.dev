use std::collections::BTreeMap;

use glob::{MatchOptions, Pattern};
use regex::Regex;
use serde::Deserialize;

use crate::shared::text::quote;

pub const CONFIG_NAME: &str = "the fu4 section of vite.config.ts";

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SelfHostedRunner {
    pub labels: Vec<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PathConfig {
    pub ignore: Vec<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Config {
    pub self_hosted_runner: SelfHostedRunner,
    pub config_variables: Option<Vec<String>>,
    pub paths: BTreeMap<String, PathConfig>,
}

#[derive(Default)]
pub struct Compiled {
    pub labels: Vec<String>,
    pub variables: Option<Vec<String>>,
    paths: Vec<(Pattern, Vec<Regex>)>,
}

const PATH_OPTIONS: MatchOptions = MatchOptions {
    case_sensitive: true,
    require_literal_separator: true,
    require_literal_leading_dot: false,
};

impl Config {
    pub fn compile(&self) -> Result<Compiled, String> {
        let mut paths = Vec::new();
        for (glob, config) in &self.paths {
            let pattern = Pattern::new(glob)
                .map_err(|_| format!("invalid glob pattern {} in \"paths\"", quote(glob)))?;
            let ignore = config
                .ignore
                .iter()
                .map(|source| {
                    Regex::new(source).map_err(|e| {
                        format!(
                            "invalid regular expression {} in \"ignore\" of {}: {e}",
                            quote(source),
                            quote(glob)
                        )
                    })
                })
                .collect::<Result<Vec<_>, _>>()?;
            paths.push((pattern, ignore));
        }
        Ok(Compiled {
            labels: self.self_hosted_runner.labels.clone(),
            variables: self.config_variables.clone(),
            paths,
        })
    }
}

impl Compiled {
    #[must_use]
    pub fn ignores(&self, path: &str, message: &str) -> bool {
        let path = path.replace('\\', "/");
        self.paths
            .iter()
            .filter(|(pattern, _)| pattern.matches_with(&path, PATH_OPTIONS))
            .any(|(_, ignore)| ignore.iter().any(|r| r.is_match(message)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_double_star_paths() {
        let config: Config =
            serde_json::from_str(r#"{"paths":{"workflows/**/*.yaml":{"ignore":["unknown .+"]}}}"#)
                .expect("config");
        let compiled = config.compile().expect("valid");
        assert!(compiled.ignores("workflows/a.yaml", "unknown x"));
        assert!(compiled.ignores("workflows/n/a.yaml", "unknown x"));
        assert!(!compiled.ignores("other/a.yaml", "unknown x"));
        assert!(
            Config {
                paths: BTreeMap::from([("[".to_owned(), PathConfig::default())]),
                ..Config::default()
            }
            .compile()
            .is_err()
        );
    }
}

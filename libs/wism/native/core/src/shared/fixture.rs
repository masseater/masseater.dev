use serde_json::json;

use crate::shared::config::Config;

const LAYERS: [&str; 6] = ["app", "pages", "widgets", "features", "entities", "shared"];
const SLICED: [&str; 4] = ["pages", "widgets", "features", "entities"];

#[must_use]
pub fn config() -> Config {
    serde_json::from_value(json!({
        "kinds": [
            {
                "name": "workspace",
                "marker": "package.json",
                "placements": [{
                    "files": ["**/*.ts"],
                    "allow": ["src/**", "bin/**", "*.config.ts"],
                    "message": "sits outside src/."
                }],
                "layers": {
                    "dir": "src",
                    "files": ["**/*.ts"],
                    "order": LAYERS,
                    "sliced": SLICED,
                    "segmented": ["shared"],
                    "entries": ["index.*"],
                    "open": ["shared/lib/**"],
                    "cross": "@x"
                }
            },
            {
                "name": "crate",
                "marker": "Cargo.toml",
                "placements": [{ "files": ["**/*.rs"], "allow": ["src/**", "build.rs"] }],
                "layers": {
                    "dir": "src",
                    "files": ["**/*.rs"],
                    "order": LAYERS,
                    "sliced": SLICED,
                    "segmented": ["shared"],
                    "loose": ["lib.rs", "main.rs", "bin/**"],
                    "moduleFiles": true
                }
            },
            {
                "name": "skill",
                "marker": "SKILL.md",
                "placements": [{ "files": ["**"], "allow": ["SKILL.md", "references/**"] }]
            }
        ]
    }))
    .expect("the fixture config is valid")
}

#[must_use]
pub fn files(names: &[&str]) -> Vec<String> {
    names.iter().map(|name| (*name).to_owned()).collect()
}

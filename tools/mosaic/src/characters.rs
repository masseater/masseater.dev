use anyhow::{Context, Result};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Target {
    pub(crate) url: String,
    pub(crate) member: Option<String>,
    #[serde(default)]
    pub(crate) alpha_floor: u8,
}

#[derive(Deserialize, Debug)]
pub(crate) struct OgCrop {
    pub(crate) left: f64,
    pub(crate) top: f64,
    pub(crate) width: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Character {
    pub(crate) slug: String,
    pub(crate) name: String,
    pub(crate) vocadb_artist_id: u64,
    pub(crate) targets: Vec<Target>,
    pub(crate) credit: String,
    pub(crate) og: OgCrop,
    pub(crate) variants: usize,
}

pub(crate) fn characters() -> Result<Vec<Character>> {
    serde_json::from_str(include_str!("../../../libs/mosaic/src/characters.json"))
        .context("characters.json を読めなかった")
}

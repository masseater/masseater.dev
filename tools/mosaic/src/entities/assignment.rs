use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub(crate) struct Tile(
    pub(crate) usize,
    pub(crate) String,
    pub(crate) String,
    pub(crate) String,
    pub(crate) String,
);

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Assignment {
    pub(crate) character: String,
    pub(crate) credit: String,
    pub(crate) cols: u32,
    pub(crate) rows: u32,
    pub(crate) pool: usize,
    pub(crate) mean_delta: f64,
    pub(crate) tiles: Vec<Tile>,
    pub(crate) errors: Vec<u32>,
    pub(crate) fallbacks: Vec<String>,
}

pub(crate) fn variant_path(data: &Path, variant: usize) -> PathBuf {
    data.join(format!("{variant}.json"))
}

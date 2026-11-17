use std::fs;
use std::path::Path;

use anyhow::Result;
use serde::{Deserialize, Serialize};

use crate::shared::image::FEATURES;

pub(crate) const SMALL_DIR: &str = "small";
pub(crate) const POOL_FILE: &str = "pool.json";
pub(crate) const FEATURES_FILE: &str = "features.json";
pub(crate) const DOWNLOADS: usize = 16;

pub(crate) type Features = [f32; FEATURES];

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Entry {
    pub(crate) song: u64,
    pub(crate) name: String,
    pub(crate) artist: String,
    pub(crate) service: String,
    pub(crate) pv_id: String,
    pub(crate) url: String,
    pub(crate) thumbs: Vec<String>,
}

pub(crate) fn small_path(cache: &Path, song: u64) -> std::path::PathBuf {
    cache.join(SMALL_DIR).join(format!("{song}.jpg"))
}

pub(crate) fn load_pool(cache: &Path) -> Result<(Vec<Entry>, Vec<Features>)> {
    let entries = serde_json::from_slice(&fs::read(cache.join(POOL_FILE))?)?;
    let listed: Vec<Vec<f32>> = serde_json::from_slice(&fs::read(cache.join(FEATURES_FILE))?)?;
    let pool = listed
        .into_iter()
        .map(|values| {
            Features::try_from(values).map_err(|_| anyhow::anyhow!("特徴の長さが合わない"))
        })
        .collect::<Result<_>>()?;
    Ok((entries, pool))
}

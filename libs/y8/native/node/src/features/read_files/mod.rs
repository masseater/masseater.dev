use std::path::PathBuf;

use napi_derive::napi;
use rayon::prelude::*;
use tracing::info_span;

#[napi]
#[must_use]
pub fn read_texts(root: String, paths: Vec<String>) -> Vec<Option<String>> {
    let _span = info_span!("y8.read_texts", "y8.files" = paths.len()).entered();
    let base = PathBuf::from(root);
    paths
        .into_par_iter()
        .map(|path| std::fs::read_to_string(base.join(path)).ok())
        .collect()
}

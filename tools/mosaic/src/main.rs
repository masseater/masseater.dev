mod characters;
mod image;
mod matching;
mod net;
mod pool;
mod site;
mod solve;
mod vocadb;

use std::path::Path;

use anyhow::{Context, Result, bail};

const STEPS: [&str; 5] = ["songs", "pool", "solve", "site", "all"];
const LIMIT_FLAG: &str = "--limit";

struct Arguments {
    step: String,
    slugs: Vec<String>,
    limit: Option<usize>,
}

fn arguments() -> Result<Arguments> {
    let mut step = None;
    let mut slugs = Vec::new();
    let mut limit = None;
    let mut given = std::env::args().skip(1);
    while let Some(argument) = given.next() {
        if argument == LIMIT_FLAG {
            let value = given.next().context("--limit に曲数が要る")?;
            limit = Some(value.parse().context("--limit は整数で渡す")?);
        } else if step.is_none() {
            step = Some(argument);
        } else {
            slugs.push(argument);
        }
    }
    let step = step
        .filter(|step| STEPS.contains(&step.as_str()))
        .with_context(|| {
            format!(
                "使い方: mosaic <{}> [キャラクター...] [--limit 曲数]",
                STEPS.join("|")
            )
        })?;
    Ok(Arguments { step, slugs, limit })
}

fn main() -> Result<()> {
    let arguments = arguments()?;
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let repository = root.join("../..");
    let data = repository.join("libs/mosaic/data");
    let public = repository.join("apps/mosaic/public/files");
    let characters = characters::characters()?;
    if let Some(unknown) = arguments
        .slugs
        .iter()
        .find(|slug| characters.iter().all(|character| &character.slug != *slug))
    {
        bail!("知らないキャラクター: {unknown}");
    }
    let runs = |step: &str| arguments.step == step || arguments.step == "all";
    for character in characters
        .iter()
        .filter(|character| arguments.slugs.is_empty() || arguments.slugs.contains(&character.slug))
    {
        let cache = root.join(".cache").join(&character.slug);
        let data = data.join(&character.slug);
        if runs("songs") {
            vocadb::fetch_songs(
                character.vocadb_artist_id,
                &cache.join("vocadb"),
                arguments.limit,
            )?;
        }
        if runs("pool") {
            pool::build_pool(&cache)?;
        }
        if runs("solve") {
            solve::solve(character, &cache, &data)?;
        }
        if runs("site") {
            site::site(
                character,
                &data,
                &root.join(".cache/tiles"),
                &public,
                &cache,
            )?;
        }
    }
    Ok(())
}

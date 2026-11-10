use std::fs;
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use std::time::Instant;

use anyhow::{Context, Result, bail, ensure};
use image::{GrayImage, RgbImage, RgbaImage};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};

use crate::characters::{Character, Target};
use crate::image::{
    BLOCKS, BLOCKS_X, BLOCKS_Y, CHANNELS, FEATURES, Filter, TILE_ASPECT, oklab, resize_gray,
    resize_rgb,
};
use crate::matching::{Edge, min_weight_full_matching};
use crate::net::get;
use crate::pool::{Entry, Features, load_pool};
use crate::vocadb::{NICONICO, YOUTUBE};

const NEAREST: usize = 300;
const RANDOM_EDGES: usize = 24;
const RANDOM_PENALTY: f64 = 10.0;
const FLOOR: f64 = 1e-6;
const COVERAGE: f64 = 0.05;
const REUSE_PENALTY: f64 = 1.0;
const ERROR_SCALE: f64 = 10000.0;
const DELTA_DIGITS: f64 = 10000.0;
const PART_GAP: f64 = 0.02;
const FILL: f64 = 0.85;
const MAX_CELLS: usize = 8200;
const MIN_COLS: u32 = 8;
const MAX_COLS: u32 = 400;
const OVERSAMPLE: u32 = 4;
const TARGET_FILE: &str = "target.png";

pub(crate) type Weights = [f32; BLOCKS];

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

pub(crate) struct Grid {
    pub(crate) cols: u32,
    pub(crate) rows: u32,
    pub(crate) cells: Vec<usize>,
    pub(crate) features: Vec<Features>,
    pub(crate) weights: Vec<Weights>,
}

fn member(archive: &[u8], name: &str) -> Result<Vec<u8>> {
    let mut zip = zip::ZipArchive::new(Cursor::new(archive))?;
    for index in 0..zip.len() {
        let mut file = zip.by_index(index)?;
        let (decoded, _, _) = encoding_rs::SHIFT_JIS.decode(file.name_raw());
        if decoded == name || file.name().is_ok_and(|plain| plain == name) {
            let mut found = Vec::new();
            file.read_to_end(&mut found)?;
            return Ok(found);
        }
    }
    bail!("zip に {name} が無い")
}

fn part(target: &Target) -> Result<RgbaImage> {
    let raw = get(&target.url).with_context(|| format!("元画像を取れなかった: {}", target.url))?;
    let bytes = match &target.member {
        Some(name) => member(&raw, name)?,
        None => raw,
    };
    let mut image = image::load_from_memory(&bytes)?.to_rgba8();
    for pixel in image.pixels_mut() {
        if pixel.0[3] < target.alpha_floor {
            pixel.0[3] = 0;
        }
    }
    Ok(image)
}

fn trimmed(image: &RgbaImage) -> Result<RgbaImage> {
    let opaque = || {
        image
            .enumerate_pixels()
            .filter(|(_, _, pixel)| pixel.0[3] > 0)
    };
    let bounds = (
        opaque().map(|(x, _, _)| x).min(),
        opaque().map(|(_, y, _)| y).min(),
        opaque().map(|(x, _, _)| x).max(),
        opaque().map(|(_, y, _)| y).max(),
    );
    let (Some(left), Some(top), Some(right), Some(bottom)) = bounds else {
        bail!("元画像が全部透明である");
    };
    Ok(image::imageops::crop_imm(image, left, top, right - left + 1, bottom - top + 1).to_image())
}

fn side_by_side(parts: &[RgbaImage]) -> Result<RgbaImage> {
    let trimmed = parts.iter().map(trimmed).collect::<Result<Vec<_>>>()?;
    let height = trimmed.iter().map(RgbaImage::height).max().unwrap_or(0);
    let gap = (f64::from(height) * PART_GAP).round() as u32;
    let width = trimmed.iter().map(RgbaImage::width).sum::<u32>()
        + gap * (trimmed.len().saturating_sub(1) as u32);
    let mut joined = RgbaImage::new(width, height);
    let mut x = 0;
    for part in &trimmed {
        image::imageops::replace(
            &mut joined,
            part,
            i64::from(x),
            i64::from(height - part.height()),
        );
        x += part.width() + gap;
    }
    Ok(joined)
}

pub(crate) fn load_target(character: &Character, cache: &Path) -> Result<RgbaImage> {
    let path = cache.join(TARGET_FILE);
    if !path.exists() {
        let parts = character
            .targets
            .iter()
            .map(part)
            .collect::<Result<Vec<_>>>()?;
        let joined = match parts.as_slice() {
            [only] => only.clone(),
            many => side_by_side(many)?,
        };
        joined.save(&path)?;
    }
    Ok(image::open(path)?.to_rgba8())
}

fn alpha_of(source: &RgbaImage) -> GrayImage {
    GrayImage::from_fn(source.width(), source.height(), |x, y| {
        image::Luma([source.get_pixel(x, y).0[3]])
    })
}

fn on_white(source: &RgbaImage) -> RgbImage {
    RgbImage::from_fn(source.width(), source.height(), |x, y| {
        let [red, green, blue, alpha] = source.get_pixel(x, y).0.map(u32::from);
        image::Rgb(
            [red, green, blue]
                .map(|value| ((value * alpha + 255 * (255 - alpha) + 127) / 255) as u8),
        )
    })
}

fn grid_rows(source: &RgbaImage, cols: u32) -> u32 {
    let (aspect_width, aspect_height) = TILE_ASPECT;
    let tile_height = f64::from(source.width()) / f64::from(cols) * f64::from(aspect_height)
        / f64::from(aspect_width);
    (f64::from(source.height()) / tile_height) as u32
}

fn covered(alpha: &GrayImage, cols: u32, rows: u32) -> Result<Vec<usize>> {
    if rows == 0 {
        return Ok(Vec::new());
    }
    let cover = resize_gray(alpha, (cols, rows), Filter::Box)?;
    Ok(cover
        .pixels()
        .enumerate()
        .filter(|(_, pixel)| f64::from(pixel.0[0]) / 255.0 > COVERAGE)
        .map(|(cell, _)| cell)
        .collect())
}

pub(crate) fn fit_cols(source: &RgbaImage, pool: usize) -> Result<u32> {
    let alpha = alpha_of(source);
    let target = MAX_CELLS.min((pool as f64 * FILL) as usize);
    let (mut low, mut high) = (MIN_COLS, MAX_COLS);
    while low < high {
        let middle = (low + high).div_ceil(2);
        if covered(&alpha, middle, grid_rows(source, middle))?.len() <= target {
            low = middle;
        } else {
            high = middle - 1;
        }
    }
    Ok(low)
}

pub(crate) fn target_cells(source: &RgbaImage, cols: u32) -> Result<Grid> {
    let alpha = alpha_of(source);
    let rows = grid_rows(source, cols);
    ensure!(rows > 0, "元画像が横に長すぎて 1 行も取れない");
    let fine = (cols * BLOCKS_X, rows * BLOCKS_Y);
    let big = resize_rgb(
        &on_white(source),
        (fine.0 * OVERSAMPLE, fine.1 * OVERSAMPLE),
        Filter::Lanczos,
    )?;
    let grid = resize_rgb(&big, fine, Filter::Box)?;
    let blocks = resize_gray(&alpha, fine, Filter::Box)?;
    let cells = covered(&alpha, cols, rows)?;
    let block_at = |cell: usize, block: usize| {
        let (column, row) = (cell as u32 % cols, cell as u32 / cols);
        let (block_x, block_y) = (block as u32 % BLOCKS_X, block as u32 / BLOCKS_X);
        (column * BLOCKS_X + block_x, row * BLOCKS_Y + block_y)
    };
    let features = cells
        .iter()
        .map(|&cell| {
            let mut found = [0.0; FEATURES];
            for block in 0..BLOCKS {
                let (x, y) = block_at(cell, block);
                for (channel, value) in oklab(grid.get_pixel(x, y).0).into_iter().enumerate() {
                    found[block * CHANNELS + channel] = value as f32;
                }
            }
            found
        })
        .collect();
    let weights = cells
        .iter()
        .map(|&cell| {
            std::array::from_fn(|block| {
                let (x, y) = block_at(cell, block);
                (f64::from(blocks.get_pixel(x, y).0[0]) / 255.0) as f32
            })
        })
        .collect();
    Ok(Grid {
        cols,
        rows,
        cells,
        features,
        weights,
    })
}

fn block_distances(cell: &Features, tile: &Features) -> [f64; BLOCKS] {
    std::array::from_fn(|block| {
        (0..CHANNELS)
            .map(|channel| {
                let index = block * CHANNELS + channel;
                (f64::from(cell[index]) - f64::from(tile[index])).powi(2)
            })
            .sum()
    })
}

fn weighted_distance(cell: &Features, weights: &Weights, tile: &Features) -> f64 {
    block_distances(cell, tile)
        .iter()
        .zip(weights)
        .map(|(distance, weight)| distance * f64::from(*weight))
        .sum()
}

fn edges_of(
    row: usize,
    cell: &Features,
    weights: &Weights,
    pool: &[Features],
    penalty: &[f64],
) -> Vec<Edge> {
    let costs: Vec<f64> = pool
        .iter()
        .zip(penalty)
        .map(|(tile, extra)| weighted_distance(cell, weights, tile) + extra)
        .collect();
    let nearest = NEAREST.min(pool.len() - 1);
    let mut order: Vec<usize> = (0..pool.len()).collect();
    if nearest < order.len() {
        order.select_nth_unstable_by(nearest, |left, right| {
            costs[*left].total_cmp(&costs[*right])
        });
    }
    let mut rng = fastrand::Rng::with_seed(row as u64);
    let near = order[..nearest].iter().map(|&column| (column, 0.0));
    let random = (0..RANDOM_EDGES).map(|_| (rng.usize(0..pool.len()), RANDOM_PENALTY));
    let mut edges: Vec<Edge> = near
        .chain(random)
        .map(|(column, extra)| Edge {
            column,
            cost: costs[column].max(0.0) + FLOOR + extra,
        })
        .collect();
    edges.sort_by(|left, right| {
        left.column
            .cmp(&right.column)
            .then(left.cost.total_cmp(&right.cost))
    });
    edges.dedup_by_key(|edge| edge.column);
    edges
}

pub(crate) fn assign(
    cells: &[Features],
    weights: &[Weights],
    pool: &[Features],
    penalty: &[f64],
) -> Result<Vec<usize>> {
    ensure!(
        pool.len() >= cells.len() && !pool.is_empty(),
        "サムネイルが足りない: マス {} に対して {} 枚",
        cells.len(),
        pool.len()
    );
    let graph: Vec<Vec<Edge>> = cells
        .par_iter()
        .zip(weights)
        .enumerate()
        .map(|(row, (cell, weights))| edges_of(row, cell, weights, pool, penalty))
        .collect();
    let chosen = min_weight_full_matching(&graph, pool.len())?;
    let mut unique = chosen.clone();
    unique.sort_unstable();
    unique.dedup();
    ensure!(
        unique.len() == cells.len(),
        "同じサムネイルが 2 マス以上に割り当てられた"
    );
    Ok(chosen)
}

pub(crate) fn variant_path(data: &Path, variant: usize) -> PathBuf {
    data.join(format!("{variant}.json"))
}

fn service_label(service: &str) -> Result<&'static str> {
    match service {
        YOUTUBE => Ok("YouTube"),
        NICONICO => Ok("ニコニコ"),
        other => bail!("知らない動画サービス: {other}"),
    }
}

fn median(mut values: Vec<f64>) -> f64 {
    values.sort_by(f64::total_cmp);
    let middle = values.len() / 2;
    match (values.len() % 2, values.get(middle)) {
        (_, None) => 0.0,
        (1, Some(value)) => *value,
        (_, Some(value)) => f64::midpoint(values[middle - 1], *value),
    }
}

fn write(
    character: &Character,
    entries: &[Entry],
    target: &Grid,
    pool: &[Features],
    chosen: &[usize],
    path: &Path,
) -> Result<()> {
    let per_block: Vec<[f64; BLOCKS]> = target
        .features
        .iter()
        .zip(chosen)
        .map(|(cell, &tile)| block_distances(cell, &pool[tile]).map(f64::sqrt))
        .collect();
    let weighted = |blocks: &[f64; BLOCKS], weights: &Weights| -> (f64, f64) {
        blocks
            .iter()
            .zip(weights)
            .fold((0.0, 0.0), |(error, total), (block, weight)| {
                (
                    error + block * f64::from(*weight),
                    total + f64::from(*weight),
                )
            })
    };
    let sums: Vec<(f64, f64)> = per_block
        .iter()
        .zip(&target.weights)
        .map(|(blocks, weights)| weighted(blocks, weights))
        .collect();
    let delta = sums.iter().map(|(error, _)| error).sum::<f64>()
        / sums.iter().map(|(_, total)| total).sum::<f64>();
    let picked: Vec<&Entry> = chosen.iter().map(|&tile| &entries[tile]).collect();
    let assignment = Assignment {
        character: character.name.clone(),
        credit: character.credit.clone(),
        cols: target.cols,
        rows: target.rows,
        pool: pool.len(),
        mean_delta: (delta * DELTA_DIGITS).round() / DELTA_DIGITS,
        tiles: target
            .cells
            .iter()
            .zip(&picked)
            .map(|(&cell, entry)| {
                Ok(Tile(
                    cell,
                    entry.name.clone(),
                    entry.artist.clone(),
                    entry.url.clone(),
                    service_label(&entry.service)?.to_owned(),
                ))
            })
            .collect::<Result<_>>()?,
        errors: sums
            .iter()
            .map(|(error, total)| {
                (error / total.max(f64::from(f32::MIN_POSITIVE)) * ERROR_SCALE).round() as u32
            })
            .collect(),
        fallbacks: picked
            .iter()
            .map(|entry| {
                if entry.service == NICONICO {
                    entry.thumbs.first().cloned().unwrap_or_default()
                } else {
                    String::new()
                }
            })
            .collect(),
    };
    let mut encoded = serde_json::to_vec(&assignment)?;
    encoded.push(b'\n');
    fs::write(path, encoded)?;
    eprintln!(
        "solve {} cols={} cells={} pool={} meanDelta={delta:.4}",
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default(),
        target.cols,
        target.cells.len(),
        pool.len()
    );
    Ok(())
}

pub(crate) fn solve(character: &Character, cache: &Path, data: &Path) -> Result<()> {
    let (entries, pool) = load_pool(cache)?;
    let source = load_target(character, cache)?;
    let target = target_cells(&source, fit_cols(&source, pool.len())?)?;
    let mut uses = vec![0.0; pool.len()];
    let mut reuse = 0.0;
    fs::create_dir_all(data)?;
    for variant in 0..character.variants {
        let started = Instant::now();
        let penalty: Vec<f64> = uses.iter().map(|used| reuse * used).collect();
        let chosen = assign(&target.features, &target.weights, &pool, &penalty)?;
        for &tile in &chosen {
            uses[tile] += 1.0;
        }
        if variant == 0 {
            reuse = REUSE_PENALTY
                * median(
                    target
                        .features
                        .iter()
                        .zip(&target.weights)
                        .zip(&chosen)
                        .map(|((cell, weights), &tile)| {
                            weighted_distance(cell, weights, &pool[tile])
                        })
                        .collect(),
                );
        }
        write(
            character,
            &entries,
            &target,
            &pool,
            &chosen,
            &variant_path(data, variant),
        )?;
        eprintln!(
            "solve variant={variant} seconds={:.1}",
            started.elapsed().as_secs_f64()
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const TILES: usize = 7;
    const CELLS: usize = 6;
    const STEP: f32 = 0.1;

    fn gray(level: usize) -> Features {
        [level as f32 * STEP; FEATURES]
    }

    #[test]
    fn each_cell_gets_the_tile_of_its_own_colour_from_a_tiny_pool() {
        let pool: Vec<Features> = (0..TILES).map(gray).collect();
        let cells: Vec<Features> = (0..CELLS).map(gray).collect();
        let weights = vec![[1.0; BLOCKS]; CELLS];
        let chosen = assign(&cells, &weights, &pool, &[0.0; TILES]).unwrap();
        assert_eq!(chosen, (0..CELLS).collect::<Vec<_>>());
    }

    #[test]
    fn a_penalty_moves_a_cell_to_the_next_closest_tile() {
        let pool: Vec<Features> = (0..TILES).map(gray).collect();
        let cells = vec![gray(0)];
        let weights = vec![[1.0; BLOCKS]; 1];
        let mut penalty = [0.0; TILES];
        penalty[0] = 100.0;
        assert_eq!(assign(&cells, &weights, &pool, &penalty).unwrap(), [1]);
    }

    #[test]
    fn refuses_a_pool_smaller_than_the_cells() {
        let pool = vec![gray(0)];
        let cells = vec![gray(0), gray(1)];
        let weights = vec![[1.0; BLOCKS]; 2];
        assert!(assign(&cells, &weights, &pool, &[0.0]).is_err());
    }

    #[test]
    fn covers_only_the_cells_under_the_opaque_half_of_the_target() {
        let source = RgbaImage::from_fn(320, 180, |x, _| {
            image::Rgba([200, 30, 30, if x < 160 { 255 } else { 0 }])
        });
        let target = target_cells(&source, 8).unwrap();
        assert_eq!((target.cols, target.rows), (8, 8));
        assert_eq!(target.cells.len(), 32);
        assert!(target.cells.iter().all(|cell| cell % 8 < 4));
        assert!(
            target
                .weights
                .iter()
                .flatten()
                .all(|weight| (weight - 1.0).abs() < 1e-6)
        );
    }

    #[test]
    fn joins_parts_side_by_side_on_a_shared_baseline() {
        let tall = RgbaImage::from_pixel(10, 100, image::Rgba([1, 2, 3, 255]));
        let mut short = RgbaImage::new(30, 60);
        for y in 10..60 {
            for x in 5..25 {
                short.put_pixel(x, y, image::Rgba([9, 9, 9, 255]));
            }
        }
        let joined = side_by_side(&[tall, short]).unwrap();
        assert_eq!(joined.dimensions(), (10 + 2 + 20, 100));
        assert_eq!(joined.get_pixel(12, 49).0[3], 0);
        assert_eq!(joined.get_pixel(12, 50).0, [9, 9, 9, 255]);
    }
}

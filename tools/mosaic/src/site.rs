use std::collections::{BTreeMap, HashMap};
use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use anyhow::{Context, Result, anyhow, bail};
use image::{RgbImage, RgbaImage};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::characters::Character;
use crate::image::{Filter, crop_to_tile, decode_rgb, encode_jpeg, resize_rgb};
use crate::net::{get, get_with};
use crate::pool::{DOWNLOADS, Entry, POOL_FILE, small_path};
use crate::solve::{Assignment, Tile, variant_path};
use crate::vocadb::{YOUTUBE_SIZES, youtube_thumbnails};

const LEVELS: [(&str, u32, u32); 4] = [("xs", 16, 0), ("s", 48, 16), ("l", 160, 8), ("t", 640, 4)];
const TILE: (u32, u32) = (640, 360);
const QUALITY: u8 = 82;
const ATLAS_QUALITY: f32 = 80.0;
const ATLAS_METHOD: i32 = 6;
const CHUNK: usize = 256;
const CHUNK_DIR: &str = "tiles";
const OG_SIZE: (u32, u32) = (1200, 630);
const OG_TILE: (u32, u32) = (64, 36);
const OG_FILE: &str = "og.jpg";
const TILES_FILE: &str = "tiles.json";
const CANDIDATES: &str = "candidates.json";
const MANIFEST: &str = "manifest.json";
const OG_IMAGE: &str = r#"property="og:image" content=""#;
const BLURRED: &str = "s=blur";
const NICO_OG: &str = "niconico-og.json";
const PUBLISHED: &str = "https://masseater.dev/mosaic/files";
const PUBLISHED_TRIES: u32 = 2;
const PUBLISHED_TIMEOUT: Duration = Duration::from_secs(30);
const VERSION_LENGTH: usize = 16;
const CACHE_NAME_LENGTH: usize = 24;
const CODE: [&str; 2] = [include_str!("site.rs"), include_str!("image.rs")];

type Placed<'path> = (usize, &'path Path);
type OgPages = Mutex<BTreeMap<String, String>>;

#[derive(Serialize, Deserialize, Clone)]
struct Level {
    tw: u32,
    th: u32,
    block: u32,
    blocks: Vec<(u32, u32, String)>,
}

#[derive(Serialize, Deserialize, Clone)]
struct TileSize {
    width: u32,
    height: u32,
}

#[derive(Serialize, Deserialize, Clone)]
struct Chunks {
    size: usize,
    dir: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VariantSummary {
    version: String,
    mean_delta: f64,
}

#[derive(Serialize, Deserialize)]
struct Manifest {
    character: String,
    credit: String,
    cols: u32,
    rows: u32,
    levels: Vec<Level>,
    tile: TileSize,
    cells: Vec<usize>,
    tiles: String,
    chunk: Chunks,
    og: String,
    candidates: String,
    variants: Vec<VariantSummary>,
}

struct Variant {
    manifest: Manifest,
    urls: Vec<String>,
    errors: Vec<u32>,
}

fn hex(bytes: &[u8], length: usize) -> String {
    let mut text = bytes.iter().fold(String::new(), |mut text, byte| {
        let _ = write!(text, "{byte:02x}");
        text
    });
    text.truncate(length);
    text
}

fn locked<Value>(mutex: &Mutex<Value>) -> Result<std::sync::MutexGuard<'_, Value>> {
    mutex.lock().map_err(|_| anyhow!("別のスレッドが落ちた"))
}

fn niconico_og(url: &str, pages: &Mutex<()>) -> Result<Option<String>> {
    let page = {
        let _one_at_a_time = locked(pages)?;
        get(url)
    };
    let Some(page) = page else {
        return Ok(None);
    };
    let text = String::from_utf8_lossy(&page);
    let found = text
        .split_once(OG_IMAGE)
        .and_then(|(_, rest)| rest.split_once('"'))
        .map(|(image, _)| image)
        .filter(|image| !image.contains(BLURRED))
        .map(|image| html_escape::decode_html_entities(image).into_owned());
    Ok(Some(found.unwrap_or_default()))
}

fn niconico(url: &str, fallback: &str, og: &OgPages, pages: &Mutex<()>) -> Result<Vec<String>> {
    let known = locked(og)?.get(url).cloned();
    let image = match known {
        Some(image) => image,
        None => match niconico_og(url, pages)? {
            Some(image) => {
                locked(og)?.insert(url.to_owned(), image.clone());
                image
            }
            None => return Ok(vec![fallback.to_owned()]),
        },
    };
    if image.is_empty() {
        Ok(vec![fallback.to_owned()])
    } else {
        Ok(vec![image, fallback.to_owned()])
    }
}

fn youtube(url: &str) -> Vec<String> {
    let last = url.rsplit('/').next().unwrap_or(url);
    let video = last.rsplit("v=").next().unwrap_or(last);
    youtube_thumbnails(video, &YOUTUBE_SIZES)
}

struct Sources<'run> {
    cache: &'run Path,
    smalls: &'run HashMap<String, PathBuf>,
    og: &'run OgPages,
    pages: &'run Mutex<()>,
}

fn save_tile(image: &RgbImage, path: &Path) -> Result<()> {
    Ok(fs::write(path, encode_jpeg(image, QUALITY, true)?)?)
}

fn fetch(url: &str, fallback: &str, sources: &Sources) -> Result<PathBuf> {
    let name = hex(&Sha256::digest(url.as_bytes()), CACHE_NAME_LENGTH);
    let path = sources.cache.join(format!("{name}.jpg"));
    if path.exists() {
        return Ok(path);
    }
    let candidates = if fallback.is_empty() {
        youtube(url)
    } else {
        niconico(url, fallback, sources.og, sources.pages)?
    };
    for candidate in candidates {
        let Some(raw) = get(&candidate) else {
            continue;
        };
        let cropped = crop_to_tile(
            &decode_rgb(&raw).with_context(|| format!("サムネイルを開けなかった: {candidate}"))?,
        );
        let tile = if cropped.width() > TILE.0 {
            resize_rgb(&cropped, TILE, Filter::Lanczos)?
        } else {
            cropped
        };
        save_tile(&tile, &path)?;
        return Ok(path);
    }
    let Some(small) = sources.smalls.get(url).filter(|small| small.exists()) else {
        bail!("サムネイルを取れなかった: {url}");
    };
    eprintln!("site: 縮小サムネで代用 {url}");
    save_tile(
        &resize_rgb(&decode_rgb(&fs::read(small)?)?, TILE, Filter::Lanczos)?,
        &path,
    )?;
    Ok(path)
}

fn open(path: &Path) -> Result<RgbImage> {
    decode_rgb(&fs::read(path)?)
        .with_context(|| format!("タイルを開けなかった: {}", path.display()))
}

struct Sheet {
    cols: u32,
    size: (u32, u32),
    tile: (u32, u32),
    side: u32,
}

fn sheet(members: &[Placed], spec: &Sheet, out: &Path) -> Result<()> {
    let mut canvas = RgbaImage::new(spec.size.0, spec.size.1);
    for &(cell, path) in members {
        let tile = resize_rgb(&open(path)?, spec.tile, Filter::Lanczos)?;
        let cell = cell as u32;
        let left = ((cell % spec.cols) % spec.side) * spec.tile.0;
        let top = ((cell / spec.cols) % spec.side) * spec.tile.1;
        for (x, y, pixel) in tile.enumerate_pixels() {
            let [red, green, blue] = pixel.0;
            canvas.put_pixel(left + x, top + y, image::Rgba([red, green, blue, 255]));
        }
    }
    let mut config = webp::WebPConfig::new().map_err(|()| anyhow!("WebP の設定を作れなかった"))?;
    config.quality = ATLAS_QUALITY;
    config.method = ATLAS_METHOD;
    let encoded = webp::Encoder::from_rgba(canvas.as_raw(), canvas.width(), canvas.height())
        .encode_advanced(&config)
        .map_err(|error| anyhow!("WebP に書き出せなかった: {error:?}"))?;
    Ok(fs::write(out, &*encoded)?)
}

fn level(tiles: &[Placed], grid: (u32, u32), out: &Path, spec: (&str, u32, u32)) -> Result<Level> {
    let (cols, rows) = grid;
    let (prefix, width, block) = spec;
    let height = width * 9 / 16;
    let side = if block == 0 { cols.max(rows) } else { block };
    let mut groups: BTreeMap<(u32, u32), Vec<Placed>> = BTreeMap::new();
    for &(cell, path) in tiles {
        let cell_at = cell as u32;
        groups
            .entry(((cell_at % cols) / side, (cell_at / cols) / side))
            .or_default()
            .push((cell, path));
    }
    let blocks = groups
        .par_iter()
        .map(|(&(block_x, block_y), members)| {
            let name = format!("{prefix}{block_x}_{block_y}.webp");
            let spec = Sheet {
                cols,
                size: (
                    side.min(cols - block_x * side) * width,
                    side.min(rows - block_y * side) * height,
                ),
                tile: (width, height),
                side,
            };
            sheet(members, &spec, &out.join(&name))?;
            Ok((block_x, block_y, name))
        })
        .collect::<Result<_>>()?;
    Ok(Level {
        tw: width,
        th: height,
        block: side,
        blocks,
    })
}

fn og_card(tiles: &[Placed], grid: (u32, u32), character: &Character, out: &Path) -> Result<()> {
    let (cols, rows) = (f64::from(grid.0), f64::from(grid.1));
    let crop = &character.og;
    let column = (crop.left * cols).round() as i64;
    let row = (crop.top * rows).round() as i64;
    let width = ((crop.width * cols).round() as u32).max(1);
    let (tile_width, tile_height) = OG_TILE;
    let height = (f64::from(width * tile_width) * f64::from(OG_SIZE.1)
        / f64::from(OG_SIZE.0)
        / f64::from(tile_height))
    .ceil() as u32;
    let mut card = RgbImage::from_pixel(
        width * tile_width,
        height * tile_height,
        image::Rgb([255; 3]),
    );
    for &(cell, path) in tiles {
        let x = i64::from(cell as u32 % grid.0) - column;
        let y = i64::from(cell as u32 / grid.0) - row;
        if (0..i64::from(width)).contains(&x) && (0..i64::from(height)).contains(&y) {
            let tile = resize_rgb(&open(path)?, OG_TILE, Filter::Lanczos)?;
            image::imageops::replace(
                &mut card,
                &tile,
                x * i64::from(tile_width),
                y * i64::from(tile_height),
            );
        }
    }
    let cropped = image::imageops::crop_imm(
        &card,
        0,
        0,
        card.width(),
        card.width() * OG_SIZE.1 / OG_SIZE.0,
    )
    .to_image();
    save_tile(
        &resize_rgb(&cropped, OG_SIZE, Filter::Lanczos)?,
        &out.join(OG_FILE),
    )
}

fn smalls(pool: &Path) -> Result<HashMap<String, PathBuf>> {
    let path = pool.join(POOL_FILE);
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let entries: Vec<Entry> = serde_json::from_slice(&fs::read(path)?)?;
    Ok(entries
        .into_iter()
        .map(|entry| (entry.url, small_path(pool, entry.song)))
        .collect())
}

fn version(character: &Character, raw: &[u8]) -> String {
    let params = format!(
        "{LEVELS:?}{TILE:?}{QUALITY}{ATLAS_QUALITY}{ATLAS_METHOD}{CHUNK}{:?}{OG_SIZE:?}{OG_TILE:?}",
        character.og
    );
    let mut hasher = Sha256::new();
    hasher.update(raw);
    hasher.update(params.as_bytes());
    for code in CODE {
        hasher.update(code.as_bytes());
    }
    hex(&hasher.finalize(), VERSION_LENGTH)
}

fn reuse_published(character: &Character, data: &Path, public: &Path) -> Result<bool> {
    let versions = (0..character.variants)
        .map(|variant| Ok(version(character, &fs::read(variant_path(data, variant))?)))
        .collect::<Result<Vec<_>>>()?;
    let base = format!("{PUBLISHED}/{}", character.slug);
    let Some(raw) = get_with(
        &format!("{base}/{MANIFEST}"),
        PUBLISHED_TRIES,
        PUBLISHED_TIMEOUT,
    ) else {
        return Ok(false);
    };
    let Ok(manifest) = serde_json::from_slice::<Manifest>(&raw) else {
        return Ok(false);
    };
    if manifest
        .variants
        .iter()
        .map(|variant| &variant.version)
        .ne(&versions)
    {
        return Ok(false);
    }
    let Some(candidates) = get_with(
        &format!("{base}/{}", manifest.candidates),
        PUBLISHED_TRIES,
        PUBLISHED_TIMEOUT,
    ) else {
        return Ok(false);
    };
    fs::write(public.join(MANIFEST), raw)?;
    fs::write(public.join(CANDIDATES), candidates)?;
    eprintln!(
        "site {} 公開中のリビジョンと同じなので作り直さない",
        character.slug
    );
    Ok(true)
}

fn variant(
    character: &Character,
    data: &Path,
    public: &Path,
    sources: &Sources,
) -> Result<Variant> {
    let raw = fs::read(data)?;
    let assignment: Assignment = serde_json::from_slice(&raw)?;
    let version = version(character, &raw);
    let downloads = rayon::ThreadPoolBuilder::new()
        .num_threads(DOWNLOADS)
        .build()?;
    let paths: Vec<PathBuf> = downloads.install(|| {
        assignment
            .tiles
            .par_iter()
            .zip(&assignment.fallbacks)
            .map(|(tile, fallback)| fetch(&tile.3, fallback, sources))
            .collect::<Result<_>>()
    })?;
    let out = public.join(&version);
    fs::create_dir_all(out.join(CHUNK_DIR))?;
    let cells: Vec<usize> = assignment.tiles.iter().map(|tile| tile.0).collect();
    let placed: Vec<Placed> = cells
        .iter()
        .copied()
        .zip(paths.iter().map(PathBuf::as_path))
        .collect();
    let grid = (assignment.cols, assignment.rows);
    let levels = LEVELS
        .iter()
        .map(|&spec| level(&placed, grid, &out, spec))
        .collect::<Result<Vec<_>>>()?;
    og_card(&placed, grid, character, &out)?;
    fs::write(out.join(TILES_FILE), serde_json::to_vec(&assignment.tiles)?)?;
    for (index, chunk) in assignment.tiles.chunks(CHUNK).enumerate() {
        fs::write(
            out.join(CHUNK_DIR).join(format!("{index}.json")),
            serde_json::to_vec(chunk)?,
        )?;
    }
    let mut widths: BTreeMap<u32, usize> = BTreeMap::new();
    for path in &paths {
        *widths.entry(image::image_dimensions(path)?.0).or_default() += 1;
    }
    eprintln!(
        "site {}/{} version={version} tiles={} widths={widths:?}",
        character.slug,
        public
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default(),
        paths.len()
    );
    Ok(Variant {
        urls: assignment
            .tiles
            .iter()
            .map(|Tile(_, _, _, url, _)| url.clone())
            .collect(),
        errors: assignment.errors,
        manifest: Manifest {
            character: assignment.character,
            credit: assignment.credit,
            cols: assignment.cols,
            rows: assignment.rows,
            levels,
            tile: TileSize {
                width: TILE.0,
                height: TILE.1,
            },
            cells,
            tiles: TILES_FILE.to_owned(),
            chunk: Chunks {
                size: CHUNK,
                dir: CHUNK_DIR.to_owned(),
            },
            og: format!("0/{version}/{OG_FILE}"),
            candidates: CANDIDATES.to_owned(),
            variants: vec![VariantSummary {
                version,
                mean_delta: assignment.mean_delta,
            }],
        },
    })
}

pub(crate) fn site(
    character: &Character,
    data: &Path,
    cache: &Path,
    public: &Path,
    pool: &Path,
) -> Result<()> {
    fs::create_dir_all(cache)?;
    let public = public.join(&character.slug);
    if public.exists() {
        fs::remove_dir_all(&public)?;
    }
    fs::create_dir_all(&public)?;
    if reuse_published(character, data, &public)? {
        return Ok(());
    }
    let smalls = smalls(pool)?;
    let og_path = pool.join(NICO_OG);
    let og: OgPages = Mutex::new(if og_path.exists() {
        serde_json::from_slice(&fs::read(&og_path)?)?
    } else {
        BTreeMap::new()
    });
    let pages = Mutex::new(());
    let sources = Sources {
        cache,
        smalls: &smalls,
        og: &og,
        pages: &pages,
    };
    let built = (0..character.variants)
        .map(|index| {
            variant(
                character,
                &variant_path(data, index),
                &public.join(index.to_string()),
                &sources,
            )
        })
        .collect::<Result<Vec<_>>>();
    fs::write(og_path, serde_json::to_vec(&*locked(&og)?)?)?;
    let mut variants = built?.into_iter();
    let first = variants.next().context("variants が 0 である")?;
    let rest: Vec<Variant> = variants.collect();
    let mut ids: HashMap<&str, usize> = HashMap::new();
    let all: Vec<(&[String], &[u32])> = std::iter::once(&first)
        .chain(&rest)
        .map(|built| (built.urls.as_slice(), built.errors.as_slice()))
        .collect();
    let candidates: Vec<Vec<(usize, u32)>> = (0..first.urls.len())
        .map(|cell| {
            all.iter()
                .map(|(urls, errors)| {
                    let next = ids.len();
                    (
                        *ids.entry(urls[cell].as_str()).or_insert(next),
                        errors[cell],
                    )
                })
                .collect()
        })
        .collect();
    fs::write(public.join(CANDIDATES), serde_json::to_vec(&candidates)?)?;
    let thumbnails = ids.len();
    let summaries: Vec<VariantSummary> = rest
        .into_iter()
        .flat_map(|built| built.manifest.variants)
        .collect();
    let mut manifest = first.manifest;
    manifest.variants.extend(summaries);
    fs::write(public.join(MANIFEST), serde_json::to_vec(&manifest)?)?;
    eprintln!(
        "site {} variants={} thumbnails={thumbnails}",
        character.slug,
        manifest.variants.len()
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn youtube_thumbnails_come_from_the_video_in_either_url_form() {
        let expected = "https://i.ytimg.com/vi/abc/maxresdefault.jpg";
        assert_eq!(youtube("https://youtu.be/abc")[0], expected);
        assert_eq!(youtube("https://www.youtube.com/watch?v=abc")[0], expected);
    }

    #[test]
    fn a_sheet_holds_each_tile_at_its_cell_and_leaves_the_rest_transparent() {
        let dir = std::env::temp_dir().join(format!("mosaic-sheet-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let red = dir.join("red.jpg");
        let blue = dir.join("blue.jpg");
        save_tile(&RgbImage::from_pixel(64, 36, image::Rgb([250, 0, 0])), &red).unwrap();
        save_tile(
            &RgbImage::from_pixel(64, 36, image::Rgb([0, 0, 250])),
            &blue,
        )
        .unwrap();
        let tiles: Vec<Placed> = vec![(0, &red), (4, &blue)];
        let built = level(&tiles, (3, 2), &dir, ("xs", 16, 0)).unwrap();
        assert_eq!((built.tw, built.th, built.block), (16, 9, 3));
        assert_eq!(built.blocks, [(0, 0, "xs0_0.webp".to_owned())]);
        let sheet = image::open(dir.join("xs0_0.webp")).unwrap().to_rgba8();
        assert_eq!(sheet.dimensions(), (48, 18));
        let at = |x, y| sheet.get_pixel(x, y).0;
        assert!(at(8, 4)[0] > 200 && at(8, 4)[2] < 60 && at(8, 4)[3] == 255);
        assert!(at(24, 13)[2] > 200 && at(24, 13)[0] < 60 && at(24, 13)[3] == 255);
        assert_eq!(at(40, 4)[3], 0);
        fs::remove_dir_all(dir).unwrap();
    }
}

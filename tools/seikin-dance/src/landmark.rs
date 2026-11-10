use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::Duration;

use anyhow::{Context, Result, anyhow, bail, ensure};
use sha2::{Digest, Sha256};
use tiny_http::{Header, Method, Request, Response, Server};
use ureq::tls::{RootCerts, TlsConfig};

use crate::video::{Clip, PIXELS};
use crate::{FPS, HEIGHT, WIDTH};

const PAGE: &str = include_str!("landmark.html");
const MODEL_URL: &str = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task";
const MODEL_SHA256: &str = "64437af838a65d18e5ba7a0d39b465540069bc8aae8308de3e318aad31fcbc7b";
const MODEL_LIMIT: u64 = 1 << 26;
const VISION: &str = "node_modules/@mediapipe/tasks-vision";
const VISION_ROUTE: &str = "/vision/";
const FRAME_ROUTE: &str = "/frame/";
const RESULT_ROUTE: &str = "/result/";
const POSE_HEADER: &str = "x-pose";
const SILENCE: Duration = Duration::from_mins(3);
const KEY_LENGTH: usize = 16;
const OPAQUE: u8 = 255;
const POSITION_DIGITS: f64 = 1e4;
const VISIBILITY_DIGITS: f64 = 1e3;

pub(crate) type Mark = [f64; 4];

pub(crate) struct Poses {
    pub(crate) masks: Vec<u8>,
    pub(crate) marks: Vec<Vec<Mark>>,
}

fn hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .flat_map(|byte| [byte >> 4, byte & 0xf])
        .map(|digit| char::from_digit(u32::from(digit), 16).unwrap_or('0'))
        .collect()
}

fn model(cache: &Path) -> Result<Vec<u8>> {
    let path = cache.join("pose_landmarker_heavy.task");
    if !path.exists() {
        let agent: ureq::Agent = ureq::Agent::config_builder()
            .tls_config(
                TlsConfig::builder()
                    .root_certs(RootCerts::PlatformVerifier)
                    .build(),
            )
            .build()
            .into();
        let mut body = Vec::new();
        let mut response = agent.get(MODEL_URL).call()?;
        let reader = response.body_mut().as_reader();
        reader.take(MODEL_LIMIT).read_to_end(&mut body)?;
        fs::write(&path, body)?;
    }
    let bytes = fs::read(&path)?;
    ensure!(
        hex(&Sha256::digest(&bytes)) == MODEL_SHA256,
        "{} が固定した sha256 と合わない",
        path.display()
    );
    Ok(bytes)
}

fn browser(url: &str, profile: &Path) -> Result<Child> {
    let chrome = std::env::var("CHROME_PATH").unwrap_or_else(|_| "google-chrome".into());
    Command::new(&chrome)
        .args(["--headless=new", "--no-sandbox", "--disable-extensions"])
        .arg(format!("--user-data-dir={}", profile.display()))
        .arg(url)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .with_context(|| format!("{chrome} を起動できない。CHROME_PATH に Chrome を渡す"))
}

fn typed(body: Vec<u8>, content_type: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let header = Header::from_bytes("content-type", content_type).expect("ASCII のヘッダ");
    Response::from_data(body).with_header(header)
}

fn content_type(path: &str) -> &'static str {
    if Path::new(path)
        .extension()
        .is_some_and(|extension| extension == "wasm")
    {
        "application/wasm"
    } else {
        "text/javascript"
    }
}

fn rgba(frame: &[u8]) -> Vec<u8> {
    frame
        .as_chunks::<3>()
        .0
        .iter()
        .flat_map(|pixel| [pixel[0], pixel[1], pixel[2], OPAQUE])
        .collect()
}

fn round(value: f64, digits: f64) -> f64 {
    (value * digits).round() / digits
}

fn marks(request: &Request) -> Result<Vec<Mark>> {
    let header = request
        .headers()
        .iter()
        .find(|header| header.field.equiv(POSE_HEADER))
        .context("姿勢のヘッダが無い")?;
    let raw: Vec<Mark> = serde_json::from_str(header.value.as_str())?;
    Ok(raw
        .into_iter()
        .map(|[x, y, z, visibility]| {
            [
                round(x, POSITION_DIGITS),
                round(y, POSITION_DIGITS),
                round(z, POSITION_DIGITS),
                round(visibility, VISIBILITY_DIGITS),
            ]
        })
        .collect())
}

fn mask(body: &[u8]) -> Result<Vec<u8>> {
    if body.is_empty() {
        return Ok(vec![0; PIXELS]);
    }
    ensure!(body.len() == PIXELS * 4, "マスクの大きさが合わない");
    Ok(body
        .as_chunks::<4>()
        .0
        .iter()
        .map(|bytes| {
            let value = f32::from_le_bytes(*bytes);
            (value * f32::from(OPAQUE)).clamp(0.0, f32::from(OPAQUE)) as u8
        })
        .collect())
}

struct Session<'a> {
    root: &'a Path,
    model: Vec<u8>,
    clip: &'a Clip,
    poses: Poses,
}

impl Session<'_> {
    fn get(&self, url: &str) -> Result<Response<std::io::Cursor<Vec<u8>>>> {
        if let Some(index) = url.strip_prefix(FRAME_ROUTE) {
            let frame = self.clip.frame(index.parse()?);
            return Ok(typed(rgba(frame), "application/octet-stream"));
        }
        if let Some(path) = url.strip_prefix(VISION_ROUTE) {
            ensure!(!path.contains(".."), "{path} は読めない");
            let body = fs::read(self.root.join(VISION).join(path))
                .with_context(|| format!("{VISION}/{path} が無い。vp install を実行する"))?;
            return Ok(typed(body, content_type(path)));
        }
        match url {
            "/" => Ok(typed(PAGE.into(), "text/html")),
            "/model" => Ok(typed(self.model.clone(), "application/octet-stream")),
            "/config" => {
                let count = self.clip.count;
                let config =
                    format!(r#"{{"count":{count},"width":{WIDTH},"height":{HEIGHT},"fps":{FPS}}}"#);
                Ok(typed(config.into(), "application/json"))
            }
            _ => Ok(Response::from_data(Vec::new()).with_status_code(404)),
        }
    }

    fn post(&mut self, request: &mut Request) -> Result<bool> {
        let mut body = Vec::new();
        request.as_reader().read_to_end(&mut body)?;
        let url = request.url().to_owned();
        if let Some(index) = url.strip_prefix(RESULT_ROUTE) {
            ensure!(
                index.parse::<usize>()? == self.poses.marks.len(),
                "結果の順番が合わない"
            );
            self.poses.marks.push(marks(request)?);
            self.poses.masks.extend(mask(&body)?);
            return Ok(false);
        }
        match url.as_str() {
            "/done" => Ok(true),
            "/error" => bail!("ページが失敗した: {}", String::from_utf8_lossy(&body)),
            _ => bail!("{url} は無い"),
        }
    }

    fn serve(&mut self, server: &Server) -> Result<()> {
        loop {
            let mut request = server
                .recv_timeout(SILENCE)
                .map_err(|error| anyhow!("{error}"))?
                .context("ブラウザーから応答が無い")?;
            if *request.method() == Method::Post {
                let done = self.post(&mut request)?;
                request.respond(Response::empty(204))?;
                if done {
                    return Ok(());
                }
            } else {
                let response = self.get(request.url())?;
                request.respond(response)?;
            }
        }
    }
}

pub(crate) fn detect(root: &Path, clip: &Clip) -> Result<Poses> {
    let cache = root.join(".cache");
    fs::create_dir_all(&cache)?;
    let server = Server::http("127.0.0.1:0").map_err(|error| anyhow!("{error}"))?;
    let address = server.server_addr().to_ip().context("ポートが無い")?;
    let mut session = Session {
        root,
        model: model(&cache)?,
        clip,
        poses: Poses {
            masks: Vec::with_capacity(clip.count * PIXELS),
            marks: Vec::with_capacity(clip.count),
        },
    };
    let mut chrome = browser(&format!("http://{address}/"), &cache.join("chrome"))?;
    let served = session.serve(&server);
    chrome.kill()?;
    chrome.wait()?;
    served?;
    Ok(session.poses)
}

fn store(source: &Path) -> Result<PathBuf> {
    let key = hex(&Sha256::digest(fs::read(source)?));
    Ok(PathBuf::from(format!("landmarks-{}", &key[..KEY_LENGTH])))
}

pub(crate) fn cached(root: &Path, source: &Path, clip: &Clip) -> Result<Poses> {
    let directory = root.join(".cache").join(store(source)?);
    let (masks, marks) = (directory.join("masks.gray"), directory.join("poses.json"));
    if masks.exists() && marks.exists() {
        return Ok(Poses {
            masks: fs::read(masks)?,
            marks: serde_json::from_slice(&fs::read(marks)?)?,
        });
    }
    let poses = detect(root, clip)?;
    fs::create_dir_all(&directory)?;
    fs::write(masks, &poses.masks)?;
    fs::write(marks, serde_json::to_vec(&poses.marks)?)?;
    Ok(poses)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::video::decode;

    const SAMPLED: usize = 30;
    const DANCE: &str = "../../apps/portfolio/public/seikin-techniques/dance.mp4";
    const TRACK: &str = "../../apps/portfolio/src/features/dance-stage/model/generated/track.json";

    fn pane(left: usize, format: &str) -> Vec<u8> {
        let crop = format!("crop={WIDTH}:{HEIGHT}:{left}:0");
        let frames = SAMPLED.to_string();
        let root = Path::new(env!("CARGO_MANIFEST_DIR"));
        let arguments = [
            "-vf",
            &crop,
            "-frames:v",
            &frames,
            "-f",
            "rawvideo",
            "-pix_fmt",
            format,
        ];
        decode(&root.join(DANCE), &arguments).expect("dance.mp4 を読める")
    }

    #[test]
    fn detect_reproduces_the_published_poses_and_matte() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"));
        let clip = Clip {
            rgb: pane(0, "rgb24"),
            count: SAMPLED,
        };
        let poses = detect(root, &clip).expect("Chrome で姿勢を推定できる");
        let track: serde_json::Value =
            serde_json::from_slice(&fs::read(root.join(TRACK)).expect("track.json")).expect("JSON");
        let published: Vec<Vec<Mark>> =
            serde_json::from_value(track["frames"].clone()).expect("frames");
        let worst = poses
            .marks
            .iter()
            .zip(&published)
            .flat_map(|(found, kept)| found.iter().zip(kept))
            .map(|(a, b)| (a[0] - b[0]).hypot(a[1] - b[1]))
            .fold(0.0, f64::max);
        assert!(worst < 0.05, "関節が {worst} ずれた");
        let matte = pane(WIDTH, "gray");
        let drift = poses
            .masks
            .iter()
            .zip(&matte)
            .map(|(a, b)| f64::from(a.abs_diff(*b)))
            .sum::<f64>()
            / matte.len() as f64;
        assert!(drift < 2.0, "マスクが平均 {drift} ずれた");
    }
}

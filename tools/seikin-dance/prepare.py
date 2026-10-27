import json
import subprocess
import sys
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

SOURCE_URL = "https://www.youtube.com/watch?v=x56amusAl2I"
POSE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task"
START = 0.0
END = 28.8
FPS = 30
WIDTH = 640
HEIGHT = 360

root = Path(__file__).resolve().parent
cache = root / ".cache"
out = root.parents[1] / "apps/portfolio/public/seikin-techniques"


def fetch(url: str, path: Path) -> Path:
    if not path.exists():
        urllib.request.urlretrieve(url, path)
    return path


def read_frames(source: Path) -> np.ndarray:
    raw = subprocess.run(
        [
            "ffmpeg", "-v", "error", "-ss", str(START), "-to", str(END), "-i", str(source),
            "-vf", f"fps={FPS},scale={WIDTH}:-2,pad={WIDTH}:{HEIGHT}:0:(oh-ih)/2",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
        ],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, HEIGHT, WIDTH, 3)


def landmark(frames: np.ndarray, model: Path) -> tuple[np.ndarray, list[list[list[float]]]]:
    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(model)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        output_segmentation_masks=True,
    )
    masks = np.zeros(frames.shape[:3], np.uint8)
    poses: list[list[list[float]]] = []
    with mp.tasks.vision.PoseLandmarker.create_from_options(options) as landmarker:
        for index, frame in enumerate(frames):
            result = landmarker.detect_for_video(
                mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(frame)),
                round(index * 1000 / FPS),
            )
            if result.segmentation_masks:
                masks[index] = np.clip(result.segmentation_masks[0].numpy_view()[..., 0] * 255, 0, 255).astype(np.uint8)
            poses.append(
                [[round(p.x, 4), round(p.y, 4), round(p.z, 4), round(p.visibility, 3)] for p in result.pose_landmarks[0]]
                if result.pose_landmarks
                else []
            )
    return masks, poses


def encode(frames: np.ndarray, path: Path, crf: int) -> None:
    height, width = frames.shape[1:3]
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", f"{width}x{height}", "-r", str(FPS), "-i", "-",
            "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", "-an", str(path),
        ],
        input=frames.tobytes(),
        check=True,
    )


def plate(frames: np.ndarray, masks: np.ndarray) -> np.ndarray:
    kernel = np.ones((61, 61), np.uint8)
    person = np.stack([cv2.dilate(mask, kernel) > 8 for mask in masks[::3]])
    samples = np.ma.masked_array(frames[::3], np.repeat(person[..., None], 3, axis=3))
    median = np.ma.median(samples, axis=0).filled(0).astype(np.uint8)
    holes = ((~person).sum(axis=0) < 8).astype(np.uint8) * 255
    return cv2.inpaint(median, cv2.dilate(holes, np.ones((9, 9), np.uint8)), 9, cv2.INPAINT_TELEA)


def main() -> None:
    cache.mkdir(exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else cache / "source.mp4"
    if not source.exists():
        subprocess.run(
            ["yt-dlp", "-f", "bv*[height<=720]+ba/b", "--merge-output-format", "mp4", "-o", str(source), SOURCE_URL],
            check=True,
        )
    frames = read_frames(source)
    landmarks = cache / "landmarks.npz"
    if not landmarks.exists():
        masks, poses = landmark(frames, fetch(POSE_MODEL_URL, cache / "pose_landmarker_heavy.task"))
        np.savez_compressed(landmarks, masks=masks, poses=json.dumps(poses))
    saved = np.load(landmarks)
    masks, poses = saved["masks"], json.loads(str(saved["poses"]))
    matte = np.repeat(masks[..., None], 3, axis=3)
    background = np.broadcast_to(plate(frames, masks), frames.shape)
    encode(np.concatenate([frames, matte, background], axis=2), out / "dance.mp4", 20)
    (root.parents[1] / "apps/portfolio/src/features/dance-stage/model/generated/pose.json").write_text(
        json.dumps({"fps": FPS, "width": WIDTH, "height": HEIGHT, "frames": poses}, separators=(",", ":"))
    )


if __name__ == "__main__":
    main()

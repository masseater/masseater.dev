---
title: "yogoto, a song manager that uses no Python (as of November 18, 2026)"
description: "I am building yogoto, a desktop app that imports songs, separates them into stems and analyzes beats and keys, entirely in Rust. This records what I learned when replacing the Python dependencies for model inference, audio downloading and decoding."
tags: ["Rust", "音楽", "yogoto"]
published: true
---

yogoto is a desktop app I am building to manage songs. When you give it a link from YouTube, Niconico or SoundCloud, or an audio file on your machine, it stores the original audio without re-encoding it. It then separates it into stems with a BS-RoFormer model and analyzes the beats, bars and key. The app runs an MCP server on `127.0.0.1`, and AI can ask it to import and separate songs and read the results from there. The code is in [apps/yogoto](https://github.com/masseater/masseater.dev/tree/main/apps/yogoto) in masseater.dev.

The whole app is written in Rust and uses no Python. Model inference, audio downloading and audio decoding were the parts usually handled with the Python ecosystem. This note records what I learned when replacing each of them.

| Step           | What runs it                                                                    | The Python equivalent I avoided |
| -------------- | ------------------------------------------------------------------------------- | ------------------------------- |
| Downloading    | My own extractors in Rust, falling back to a version-pinned yt-dlp if they fail | yt-dlp                          |
| Separation     | BS-RoFormer implemented with candle                                             | PyTorch, conversion to ONNX     |
| Beats and bars | A Rust port of Beat This! running on rten                                       | beat_this                       |
| Key            | S-KEY exported to ONNX, running on rten                                         | skey                            |
| Decoding       | symphonia, and opus-rs for Opus                                                 | ffmpeg                          |

## BS-RoFormer reads checkpoints directly with candle

The BS-RoFormer family of separation models is published as PyTorch checkpoints with YAML settings. Converting to ONNX needs Python, so I implemented the network with candle 0.11 and had it read the `.ckpt` and `.yaml` files as they are. The weights are fetched from Hugging Face with the revision pinned. The default model is BS-RoFormer SW, which outputs six stems: bass, drums, other, vocals, guitar and piano[^bs-rofo-sw].

The tests fetch the weights of the pinned revision and PyTorch's output, and compare the two. At first the outputs did not match. The cause was a setting called `zero_dc`, which sets the DC component of the spectrogram to 0. The separation test took 243 seconds on the CPU. After changing it to pass an already loaded separator into the functions and shortening the test chunks, it took about 21 seconds.

I also checked whether there were newer models. The newest model with published weights was SubRoformer from ZFTurbo's training code v1.0.23, released on November 8, 2026. Its average Multisong score was 10.45, below SW. The models with the highest scores, such as BS Roformer 124 bands 2026.07, can only be used through MVSep's paid service, and their weights are not published[^mvsep-algorithms].

## My own downloader is 4 to 15 times faster than yt-dlp in the cloud

yt-dlp is written in Python, so I wrote per-site extractors in Rust and measured both in a cloud container. Each cell is the median of 5 runs, measuring the time from starting the process to finishing writing the file.

| Site                           | yt-dlp onefile | yt-dlp onedir, `-N 8` | Rust   |
| ------------------------------ | -------------- | --------------------- | ------ |
| YouTube, 3.4 MB of Opus        | 14.1 s         | 19.5 s                | 0.94 s |
| Niconico, HLS with 54 segments | 5.6 s          | 4.0 s                 | 3.4 s  |
| SoundCloud, AAC over HLS       | 4.1 s          | 3.7 s                 | 1.4 s  |

Most of the difference on YouTube comes from the number of requests. yt-dlp loads the watch page and the player's JavaScript, and solves the challenge with Deno. From a data center IP, the web client receives 403 and 429 and keeps retrying. The Rust side sends only one request to InnerTube as the visionOS client. What comes back is an unencrypted direct URL, which it fetches in parallel with Range requests of 1 MiB each. A plain GET without a Range header is throttled to about 32 KB/s. The YouTube and Niconico files matched yt-dlp's output byte for byte.

The Rust side can only handle the common cases. Videos for children, age-restricted videos, members-only videos and live streams cannot be played. A client can also stop working without notice. So when my own fetching fails, it downloads the official onedir build of yt-dlp, pinned by version and SHA-256, and uses it instead. Which path was taken, and why my own fetching failed, are recorded in tracing spans.

## symphonia cannot decode Opus

YouTube's audio arrives as Opus in WebM, but symphonia 0.6 has no Opus decoder. So the Opus packets are decoded with opus-rs, and the number of leading samples given by the pre-skip in bytes 10 to 11 of the OpusHead header are discarded. Without discarding them, extra samples are attached to the start of the decoded audio, and its position drifts from the original audio.

Stems are written out as 24-bit FLAC. flacenc, the first encoder I tried, produced files that symphonia could not read. So I switched to flac-codec. When I multiplied the floating-point values by `32767 * 256`, an error of 1.5e-5 remained after writing and reading back. Multiplying by 2 to the 23rd power and clamping made the error disappear.

## The beat and key models run on rten

[The Rust port of Beat This!](https://github.com/danigb/beat-this-rs) runs the ONNX model on rten, a runtime written in Rust, and needs no system libraries[^beat-this-rs]. It returns the times of the beats and of the starts of bars, so yogoto builds bars from the starts of bars. On a synthesized 30-second song, the full-size model took about 3 seconds on the CPU.

For key detection, it uses Deezer's S-KEY exported to ONNX. Feature extraction is included in the graph, so passing raw audio at 22,050 Hz returns 24 probabilities. The file is 0.33 MB and runs on the same rten. According to the explanation by the person who exported it, if you pass only vocals, it returns the true key and its relative key about equally often, so it is meant to be used on accompaniment stems[^skey-onnx]. yogoto adds up the stems other than vocals and estimates the key every 8 bars. Places where the key changes appear as ranges.

For detecting structure such as verses and choruses, SongFormer is a candidate. There is an ONNX export of it, but it needs two encoders, MuQ and MusicFM, of about 410 MB. The weights of MuQ are under a license limited to non-commercial use[^songformer-onnx].

## In a cloud container, disk runs out before memory

A cloud session has about 39 GB of writable disk and 15 GB of memory. Running all the Rust checks of the monorepo at once filled the disk with `target/debug`, and push failed with `No space left on device`. Running the checks one workspace at a time and deleting `target/debug` in between let the push through. This works because the task runner replays the cached results.

[^bs-rofo-sw]: [enerjazzer/BS-ROFO-SW-Fixed](https://huggingface.co/enerjazzer/BS-ROFO-SW-Fixed)

[^mvsep-algorithms]: [MVSep algorithms](https://mvsep.com/en/algorithms)

[^beat-this-rs]: [beat-this-rs](https://github.com/danigb/beat-this-rs)

[^skey-onnx]: [musetric/skey-onnx](https://huggingface.co/musetric/skey-onnx)

[^songformer-onnx]: [akineAItech/CUE-Uttaro-SongFormer-ONNX](https://huggingface.co/akineAItech/CUE-Uttaro-SongFormer-ONNX)

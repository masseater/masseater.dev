---
title: "yogoto, a song manager without Python (as of November 18, 2026)"
description: "yogoto is a desktop app I am building in Rust to import songs, separate them into stems and detect beats and keys. This memo records what I found when I replaced the Python parts: model inference, audio downloading and decoding."
tags: ["Rust", "Music", "yogoto"]
published: true
---

yogoto is a desktop app I am building to manage songs. When I drop in a YouTube, Niconico or SoundCloud link, or an audio file on my PC, it keeps the original audio without re-encoding it, separates it into stems with a BS-RoFormer model, and detects beats, bars and keys. AIs can request imports and separations and read the results through the MCP server the app serves on `127.0.0.1`. The code is in [apps/yogoto](https://github.com/masseater/masseater.dev/tree/main/apps/yogoto) of masseater.dev.

The whole app is in Rust with no Python. Model inference, audio downloading and audio decoding were the parts where the Python ecosystem is the usual answer, so this memo records what I found when I replaced each of them.

| Stage          | What runs                                                  | Python equivalent avoided |
| -------------- | ---------------------------------------------------------- | ------------------------- |
| Download       | Own Rust extractors, falling back to a pinned yt-dlp build | yt-dlp                    |
| Separation     | BS-RoFormer implemented with candle                        | PyTorch, ONNX conversion  |
| Beats and bars | Rust port of Beat This! on the rten runtime                | beat_this                 |
| Key            | S-KEY exported to ONNX, on rten                            | skey                      |
| Decoding       | symphonia, plus opus-rs for Opus                           | ffmpeg                    |

## BS-RoFormer runs on candle by reading the community checkpoints directly

Separation models in the BS-RoFormer family are published as PyTorch checkpoints with a YAML config. Converting them to ONNX needs Python, so I implemented the network with candle 0.11 and made it read the `.ckpt` and `.yaml` files as they are. The weights come from Hugging Face at a pinned revision. The default model is BS-RoFormer SW, which outputs six stems: bass, drums, other, vocals, guitar and piano[^bs-rofo-sw].

The tests download the same weights and a PyTorch output at a pinned revision and compare the two. The output did not match at first, and the cause was `zero_dc`, the option that zeroes the DC bin of the spectrogram. Running the separation test on CPU took 243 seconds. Passing a loaded separator into the function and using a shorter chunk in the test brought it to about 21 seconds.

I also checked whether a newer model was available. The newest model with public weights was SubRoformer in ZFTurbo's training code v1.0.23, released on 2026-11-08, and its average Multisong score of 10.45 was below SW. The models with the highest scores, such as BS Roformer 124 bands 2026.07, are only available as a paid service on MVSep, and their weights are not public[^mvsep-algorithms].

## The own downloader is 4 to 15 times faster than yt-dlp in the cloud

yt-dlp is written in Python, so I wrote an extractor for each site in Rust and measured both in the cloud container. Each cell is the median of 5 runs, from process start to the file being written.

| Site                      | yt-dlp onefile | yt-dlp onedir, `-N 8` | Rust   |
| ------------------------- | -------------- | --------------------- | ------ |
| YouTube, 3.4 MB Opus      | 14.1 s         | 19.5 s                | 0.94 s |
| Niconico, 54 HLS segments | 5.6 s          | 4.0 s                 | 3.4 s  |
| SoundCloud, AAC HLS       | 4.1 s          | 3.7 s                 | 1.4 s  |

Most of the difference on YouTube comes from requests. yt-dlp loads the watch page and the player JavaScript and solves a challenge with Deno, and from a datacenter IP the web client gets 403 and 429 responses and retries. The Rust path sends one InnerTube request as the visionOS client, which returns direct URLs without a cipher, and downloads in parallel 1 MiB Range requests. A plain GET without a Range header is throttled to about 32 KB/s. The YouTube and Niconico files are byte-identical to yt-dlp's output.

The Rust path only covers the common case. It cannot play videos made for kids, age-restricted videos, members-only videos or live streams, and a single client can be cut off without warning. So when it fails, yogoto downloads the official yt-dlp onedir build pinned by version and SHA-256, and uses it instead. The route that was used and the reason the own path failed are recorded on a tracing span.

## symphonia does not decode Opus

YouTube audio arrives as Opus in WebM, and symphonia 0.6 has no Opus decoder. I decode Opus packets with opus-rs and drop the number of samples given by the pre-skip field at bytes 10 and 11 of the OpusHead header. Without that, the decoded audio starts with extra samples and no longer lines up with the original.

The stems are written as 24-bit FLAC. The first encoder I tried, flacenc, produced files that symphonia could not decode, so I switched to flac-codec. Scaling floats by `32767 * 256` left an error of 1.5e-5 after a round trip. Scaling by 2^23 with a clamp removed it.

## Beat and key models run on rten without Python

The [Rust port of Beat This!](https://github.com/danigb/beat-this-rs) runs ONNX models on rten, a runtime written in Rust, and needs no system library[^beat-this-rs]. It returns beat and downbeat times, and yogoto builds bars from the downbeats. On a synthetic 30-second track, the full model took about 3 seconds on CPU.

For key detection, an ONNX export of Deezer's S-KEY includes the feature extraction in the graph, so it takes raw audio at 22,050 Hz and returns 24 probabilities. The file is 0.33 MB and runs on the same rten. The export notes that it is meant for the instrumental stem, because an isolated vocal yields the relative minor about as often as the key[^skey-onnx]. yogoto sums every stem except vocals and estimates the key every 8 bars, so that key changes show up as ranges.

For sections such as verse and chorus, SongFormer is the candidate. An ONNX export exists, but it needs two encoders of about 410 MB each, MuQ and MusicFM, and the MuQ weights are licensed for non-commercial use only[^songformer-onnx].

## The cloud container runs out of disk before memory

The cloud session has about 39 GB of writable disk and 15 GB of memory. Running every Rust check of the monorepo at once filled `target/debug` and the push failed with `No space left on device`. Running each workspace's checks one at a time and deleting `target/debug` in between let the push go through, because the task runner replays results it has cached.

[^bs-rofo-sw]: [enerjazzer/BS-ROFO-SW-Fixed](https://huggingface.co/enerjazzer/BS-ROFO-SW-Fixed)

[^mvsep-algorithms]: [MVSep algorithms](https://mvsep.com/en/algorithms)

[^beat-this-rs]: [beat-this-rs](https://github.com/danigb/beat-this-rs)

[^skey-onnx]: [musetric/skey-onnx](https://huggingface.co/musetric/skey-onnx)

[^songformer-onnx]: [akineAItech/CUE-Uttaro-SongFormer-ONNX](https://huggingface.co/akineAItech/CUE-Uttaro-SongFormer-ONNX)

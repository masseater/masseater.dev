# @masseater.dev/videos

This workspace is the Remotion project for the owner's explainer videos. Each folder in `src/pages/` with a `video.md` is one video, and Studio shows one composition per format the script lists.

Follow `video-production` for how a video is made. The commands are `node bin/videos.ts <command> <slug>`:

- `new` writes a script template; `make` fetches the BGM, narrates with VOICEVOX, checks the script and writes one still per scene to `out/<slug>/review/` for the self-review; `render` checks and writes the MP4 to `out/<slug>/`.
- `eject <slug> <scene>` creates `src/pages/<slug>/scenes/<scene>.tsx`, which replaces that scene in that video only. Words and timing still come from `video.md`.
- `make` and `voice` need a VOICEVOX engine at `VOICEVOX_URL` (default `http://127.0.0.1:50021`). `make`, `review` and `render` use the Chrome at `REMOTION_BROWSER_EXECUTABLE` when it is set.

Rules:

- Never commit BGM, sound effects, narration or other downloaded material. They live in `public/cache/`, which Git ignores, and are fetched again on each machine. Name each by its URL in `video.md`.
- Change words, order and length in `video.md`, never in an ejected scene.

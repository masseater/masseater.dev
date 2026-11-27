# @masseater.dev/videos

This workspace is the Remotion project for the owner's explainer videos. Each folder in `src/pages/` with a `script.ts` and a `video.tsx` is one video, and Studio shows one composition per format the script lists.

Follow `video-production` for how a video is made. The commands are `node bin/videos.ts <command> <slug>`:

- `new` writes `script.ts` and `video.tsx` from the six-part template; `make` fetches the BGM and sound effects, narrates with VOICEVOX, checks the script and writes one still per cut to `out/<slug>/review/` for the self-review; `render` checks and writes the MP4 to `out/<slug>/`.
- `make` and `voice` need a VOICEVOX engine at `VOICEVOX_URL` (default `http://127.0.0.1:50021`). `make`, `review` and `render` use the Chrome at `REMOTION_BROWSER_EXECUTABLE` when it is set.

Rules:

- Never commit BGM, sound effects, narration, standing art or other downloaded material. They live in `public/cache/`, which Git ignores, and are fetched again on each machine. Name each by its URL in `script.ts` or in the manifest.
- Put words, order and holds in `script.ts`. Put what is on screen in `video.tsx`. Every cut in `script.ts` needs an entry in `draw`.
- Name downloaded images in `src/shared/config/stock.ts` and list them in the script's `images`. いらすとや allows up to 20 illustrations per video. Take screenshots with Playwright into `public/cache/shots/`.
- `src/pages/pnpm-*/` are one video per reference channel style. Start a new video by copying the closest one.

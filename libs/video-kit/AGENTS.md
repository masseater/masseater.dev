# @masseater.dev/video-kit

This workspace holds what every explainer video shares. A video is written in Remotion as `script.ts` (the `VideoScript`: lines, holds, readings, BGM) and `video.tsx` (a `draw` function per cut). This workspace plans the timing of each cut and line, checks the script, and draws the base of every video: telop, narration, BGM, the standing art and the per-line zoom. It also exports the parts that `draw` uses, such as `Headline`, `Points` and `Rating`.

Change a part here only when the change should reach every video. A change for one video belongs in that video's `video.tsx`.

`src/app/__screenshots__/` holds the baseline frames of the script in `src/app/sample.test.support.tsx`. When a part's look changes on purpose, delete the affected baseline and run `vp test run`. Look at the new image before committing it.

Colors, the type scale and the safe areas live in `src/app/video.css` as Tailwind theme tokens and utilities. Use only Noto Sans JP (Black and Bold) and IBM Plex Mono. Do not add camera shake, whip pans or other motion that does not follow the content. Keep every text element inside the safe area.

A part passes values that change each frame to its styles as CSS custom properties through the `vars` of `Box` and `Run`. It never uses inline style properties for them.

Sound effects come from Sound Effect Lab (soundeffect-lab.info), which allows use in videos without credit and forbids redistribution. The standing art comes from the character's distributor and is never committed. `apps/videos` downloads both into its ignored cache. Never commit them.

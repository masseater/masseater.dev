# @masseater.dev/video-kit

This workspace turns a Markdown video script (`video.md`) into the standard explainer video: it parses the script, plans the timing of each scene and line, checks the script, and draws the scenes as Remotion components for 9:16 and 16:9.

- The look of every video comes from here. Change a scene here only when the change should reach every video; a change for one video belongs in that video's ejected scene in `apps/videos`.
- `src/app/__screenshots__/` holds the baseline frames of the script in `src/app/sample.test.support.ts`. When a scene's look changes on purpose, delete the affected baseline, run `vp test run`, and look at the new image before committing it.
- Colors, the type scale and the safe areas live in `src/app/video.css` as Tailwind theme tokens and utilities; the largest sizes of text that shrinks to fit live in `src/shared/config/type.ts`. Keep every text element inside the safe area.
- A scene passes values that change each frame to its styles as CSS custom properties through the `vars` of `Box` and `Run`, never as inline style properties.
- Sound effects come from 効果音ラボ, which allows use in videos without credit and forbids redistribution. `apps/videos` downloads them into its ignored cache from the page that lists each file; never commit them.

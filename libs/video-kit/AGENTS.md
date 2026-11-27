# @masseater.dev/video-kit

This workspace turns a Markdown video script (`video.md`) into the standard explainer video. It parses the script, plans the timing of each scene and line, and checks the script. It draws the scenes as Remotion components for 9:16 and 16:9.

The look of every video comes from here. Change a scene here only when the change should reach every video. A change for one video belongs in that video's ejected scene in `apps/videos`.

`src/app/__screenshots__/` holds the baseline frames of the script in `src/app/sample.test.support.ts`. When a scene's look changes on purpose, delete the affected baseline and run `vp test run`. Look at the new image before committing it.

Colors, the type scale and the safe areas live in `src/app/video.css` as Tailwind theme tokens and utilities. The largest sizes of text that shrinks to fit live in `src/shared/config/type.ts`. Keep every text element inside the safe area.

A scene passes values that change each frame to its styles as CSS custom properties through the `vars` of `Box` and `Run`. It never uses inline style properties for them.

Sound effects come from Sound Effect Lab (soundeffect-lab.info), which allows use in videos without credit and forbids redistribution. `apps/videos` downloads them into its ignored cache from the page that lists each file. Never commit them.

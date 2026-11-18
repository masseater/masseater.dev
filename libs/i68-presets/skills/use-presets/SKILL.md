---
name: use-presets
description: >
  Use when choosing which @r_masseater/i68-presets presets a project extends, setting their
  options, explaining a pop/, voicing/ or classical/ finding in plain words, or adding a preset
  for another style of writing music.
metadata:
  type: core
  library: "@r_masseater/i68-presets"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/features/check-pop/model/preset.ts
  - src/features/check-voicing/model/preset.ts
  - src/features/check-classical/model/preset.ts
---

# use-presets

Each preset returns an i68 config for one concern. List the ones you want in `extends`.

```ts
import "@r_masseater/i68/vite";
import { classical, pop, voicing } from "@r_masseater/i68-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  i68: {
    extends: [pop({ ranges: { lead: ["A3", "E5"], bass: ["E1", "G3"] } }), voicing(), classical()],
  },
});
```

## Presets

- `pop({ ranges, maxLeap, breathSeconds })`: key, part range, melody leaps and breath. `ranges` maps a track name or role to `[low, high]` pitch names.
- `voicing()`: semitone clashes, low interval limits, crowded low mids (A2-B3), harmony above the melody and chord voices that leap.
- `classical()`: parallel fifths and octaves between melody and bass, and dissonances on strong beats that do not step down.
- `recommended(popOptions)`: `pop` and `voicing`.

Rules read the track `role`. A track without a role is only checked by rules that look at every pitched part (`out-of-key`, `semitone-clash`, `low-interval-limit`, `crowded-low-mids`).

## Explain a finding

Every report has a `detail` with the fix. When the person does not know music theory, say what they would hear (a rumble, a wrong-sounding note, a line that cannot be sung in one breath) before the theory name.

## Add a style

Put a new style in `src/features/check-<style>/` with its own plugin and preset function, and export both from `src/app/index.ts`. Do not add options to an existing preset to change its style.

---
name: use-presets
description: >
  Use when choosing which @r_masseater/i68-presets presets a project extends, setting their
  options, explaining a pop/, voicing/, classical/, progressions/ or bach/ finding in plain words, or adding a preset
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
  - src/features/check-progressions/model/preset.ts
  - src/features/check-style/model/preset.ts
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

| Preset                                    | What it checks                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `pop({ ranges, maxLeap, breathSeconds })` | Key, part range, melody leaps and breath. `ranges` maps a track name or role to `[low, high]` pitch names.                             |
| `voicing()`                               | Semitone clashes, low interval limits and crowded low mids (A2-B3). It also flags harmony above the melody and chord voices that leap. |
| `classical()`                             | Parallel fifths and octaves between melody and bass. It also flags dissonances on strong beats that do not step down.                  |
| `progressions()`                          | Names famous progressions where they start. `PROGRESSIONS` lists them.                                                                 |
| `bach()`                                  | Warns on chord changes Bach rarely makes in his chorales. The detail names the chords he usually picks.                                |
| `recommended(popOptions)`                 | `pop` and `voicing`.                                                                                                                   |

`stylePluginOf(table)` turns any `StyleTable` of chord transition counts into the same rule as `bach()` for another style.

Rules read the track `role`. A track without a role is only checked by rules that look at every pitched part. Those are `out-of-key`, `semitone-clash`, `low-interval-limit` and `crowded-low-mids`.

## Explain a finding

Every report has a `detail` with the fix. When the person does not know music theory, start with what they would hear. Examples are a rumble, a wrong-sounding note, or a line that cannot be sung in one breath. Give the theory name after that.

## Add a style

Put a new style in `src/features/check-<style>/` with its own plugin and preset function. Export both from `src/app/index.ts`. Do not add options to an existing preset to change its style.

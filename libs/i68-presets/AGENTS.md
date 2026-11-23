# @r_masseater/i68-presets

This workspace holds the official i68 rule presets, one per concern: `pop`, `harmony`, `classical`, `progressions` and `bach`, and `recommended`, which extends `pop` and `harmony`. It uses only the rule API of `@r_masseater/i68` and the analysis of `@r_masseater/fumx-parser`, so it ships as plain TypeScript.

- Add a new style of writing music as a new preset and plugin under `src/features/check-<style>/`, not as options on an existing one.
- Every rule warns by default and its `detail` says how to fix the finding.
- Before changing a threshold, run the presets on real songs and compare the counts.
- `bach` reads a precomputed table of chord transitions. Regenerate it with `vp run build-style-tables`, which downloads the corpus; commit only the table, never the scores.
- `node bin/find-habits.ts <songs...>` reads the songs of one style (`.fumx` or Ableton `.als`) and lists the chord changes they share that the Bach table rarely makes, with where each one occurs. It is a development tool and is not published.

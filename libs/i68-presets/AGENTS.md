# @r_masseater/i68-presets

This workspace holds the official i68 rule presets, one per concern: `pop`, `harmony`, `classical`, `progressions` and `bach`, and `recommended`, which extends `pop` and `harmony`. It uses only the rule API of `@r_masseater/i68` and the analysis of `@r_masseater/fumx-parser`, so it ships as plain TypeScript.

- Add a new style of writing music as a new preset and plugin under `src/features/check-<style>/`, not as options on an existing one.
- Every rule warns by default and its `detail` says how to fix the finding.
- Before changing a threshold, run the presets on real songs and compare the counts.
- `bach` reads a precomputed table of chord transitions. Regenerate it with `vp run build-style-tables`, which downloads the corpus; commit only the table, never the scores.
- `node bin/find-habits.ts <songs...> --against <baseline>` reads the songs of one style (`.fumx` or Ableton `.als`) and lists the chord changes they share that the baseline rarely makes, with where each one occurs. The baseline is `bach` or a Chordonomicon genre table (`all`, `pop`, `rock` and so on). It is a development tool and is not published.
- `node bin/build-genre-tables.ts` downloads Chordonomicon and writes its genre tables to `$XDG_CACHE_HOME/i68-presets/chordonomicon/`. Chordonomicon is CC BY-NC, so never commit the corpus or the tables and never ship them in a preset.

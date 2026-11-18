# @r_masseater/i68-presets

This workspace holds the official i68 rule presets, one per concern: `pop`, `voicing` and `classical`, and `recommended`, which extends `pop` and `voicing`. It uses only the rule API of `@r_masseater/i68` and the analysis of `@r_masseater/fumx-parser`, so it ships as plain TypeScript.

- Add a new style of writing music as a new preset and plugin under `src/features/check-<style>/`, not as options on an existing one.
- Every rule warns by default and its `detail` says how to fix the finding.
- Before changing a threshold, run the presets on real songs and compare the counts.

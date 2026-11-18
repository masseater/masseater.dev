# @r_masseater/i68-presets

The official rule presets for the [i68](https://www.npmjs.com/package/@r_masseater/i68) `.fumx` song linter, one preset per concern. You do not need to know music theory to use them: each finding says what sounds wrong and how to fix it.

```sh
vp add -D @r_masseater/i68 @r_masseater/i68-presets effect
```

```ts
import "@r_masseater/i68/vite";
import { classical, recommended } from "@r_masseater/i68-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  i68: { extends: [recommended(), classical()] },
});
```

Pick the presets that match how you write, or take `pop` and `voicing` together with `recommended()`. Every rule warns rather than fails.

## pop

For songs with a lead vocal. `pop({ ranges, maxLeap, breathSeconds })`.

| Rule              | What it catches                                                                 | How to fix it                                                           |
| ----------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `pop/out-of-key`  | A note outside both the key the section implies and the chord under it          | Move it a semitone, or ignore the line if the borrowed note is intended |
| `pop/part-range`  | A note outside its part's range (melody C3-C6, bass E1-C4 unless set per track) | Move the phrase an octave, or set `ranges`                              |
| `pop/melody-leap` | A melody jump over an octave                                                    | Make it smaller, or step back the other way right after it              |
| `pop/breath`      | A sung line longer than 8 seconds without a rest                                | Put a short rest in the phrase                                          |

## voicing

Arranging rules for chords and parts sounding together. `voicing()`.

| Rule                         | What it catches                                                        | How to fix it                                             |
| ---------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| `voicing/semitone-clash`     | Two upper parts a minor 2nd or minor 9th apart                         | Move one of them to a chord note                          |
| `voicing/low-interval-limit` | A close interval below the pitch where it turns muddy (a 3rd below C3) | Widen it or move the upper note up an octave              |
| `voicing/crowded-low-mids`   | More than 3 notes at once between A2 and B3                            | Thin the chord or move notes out of that range            |
| `voicing/chord-above-melody` | A harmony part above the lead melody                                   | Keep the chord below the melody                           |
| `voicing/voice-jump`         | A chord voice that leaps more than a major 3rd into the next chord     | Keep shared notes and move each voice to the nearest note |

## classical

Common-practice part writing, off unless you add it. `classical()`.

| Rule                              | What it catches                                                  | How to fix it                  |
| --------------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| `classical/parallel-perfects`     | Melody and bass moving in parallel fifths or octaves             | Move one of them the other way |
| `classical/unresolved-dissonance` | A dissonant melody note on a strong beat that does not step down | Move the next note down a step |

## progressions

Points out well-known chord progressions so you can see where a song leans on one. `progressions()`.

| Rule                 | What it catches                                                                                       | How to fix it                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `progressions/named` | 丸サ (IVM7 III7 VIm7), 王道 (IV V IIIm VIm), 小室 (VIm IV V I), Canon, ii–V–I and Andalusian cadences | Nothing to fix; change a chord if you do not want that progression |

Matching ignores sevenths, so IV V IIIm VIm and IVM7 V7 IIIm7 VIm7 are both 王道. `PROGRESSIONS` lists them.

## bach

Compares each chord change with what Bach did in his 370 four-part chorales. `bach()`.

| Rule                   | What it catches                                                                   | How to fix it                                            |
| ---------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `bach/rare-transition` | A chord change that Bach makes less than 3% of the time after the same 1-3 chords | Use one of the chords the detail says Bach usually picks |

Chords are read as degrees of the key each section implies (minor keys as their relative major), so the table works in any key. The rule looks at the longest context of up to 3 chords that the table has seen at least 8 times. Set `["warn", { share, seen }]` to change both numbers.

The table in `src/features/check-style/data/bach-chorales.json` holds only counts of chord transitions. It is built from the Humdrum kern files of [craigsapp/bach-370-chorales](https://github.com/craigsapp/bach-370-chorales) by `vp run build-style-tables`, and the scores themselves are not in this package. To make a preset for another composer, build a `StyleTable` the same way and pass it to `stylePluginOf(table)`.

Rules find parts by the `role` of their track (`melody`, `countermelody`, `harmony`, `bass`, `drums`), so give each track a role.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/i68-presets#<skill>`.

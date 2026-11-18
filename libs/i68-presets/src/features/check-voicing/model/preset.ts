import { definePlugin } from "@r_masseater/i68";
import type { I68Config, Plugin } from "@r_masseater/i68";

import { chordAboveMelody } from "./chord-above-melody.ts";
import { crowdedLowMids } from "./crowded-low-mids.ts";
import { lowIntervalLimit } from "./low-interval-limit.ts";
import { semitoneClash } from "./semitone-clash.ts";
import { voiceJump } from "./voice-jump.ts";

export const voicingPlugin: Plugin = definePlugin({
  rules: {
    "semitone-clash": semitoneClash,
    "low-interval-limit": lowIntervalLimit,
    "crowded-low-mids": crowdedLowMids,
    "chord-above-melody": chordAboveMelody,
    "voice-jump": voiceJump,
  },
});

export const voicing = (): I68Config => ({
  plugins: { voicing: voicingPlugin },
  rules: {
    "voicing/semitone-clash": "warn",
    "voicing/low-interval-limit": "warn",
    "voicing/crowded-low-mids": "warn",
    "voicing/chord-above-melody": "warn",
    "voicing/voice-jump": "warn",
  },
});

import { Schema } from "effect";

import { Name, OptionalNumber, OptionalShare, Share, Ticks, kind } from "./fields.ts";

export const SendSchema = Schema.Struct({ bus: Name, amount: Share });

const HighpassSchema = kind("highpass")({ hertz: Schema.Finite, resonance: OptionalNumber });

const LowpassSchema = kind("lowpass")({
  hertz: Schema.Finite,
  targetHertz: OptionalNumber,
  resonance: OptionalNumber,
});

const GainSchema = kind("gain")({ decibels: Schema.Finite });

const DriveSchema = kind("drive")({ amount: Schema.Finite });

export const PlayParamSchema = Schema.Union([
  kind("semi")({ semitones: Schema.Finite }),
  kind("length")({ milliseconds: Schema.Finite }),
  kind("attack")({ milliseconds: Schema.Finite }),
  kind("release")({ milliseconds: Schema.Finite }),
  kind("decay")({ milliseconds: Schema.Finite }),
  kind("offset")({ milliseconds: Schema.Finite }),
  HighpassSchema,
  LowpassSchema,
  GainSchema,
  kind("pan")({ amount: Share }),
  DriveSchema,
  kind("send")({ bus: Name, amount: Share }),
  kind("reverse")({}),
]);

export type PlayParam = typeof PlayParamSchema.Type;

const DelayTimeSchema = Schema.Union([
  kind("ticks")({ ticks: Ticks }),
  kind("milliseconds")({ milliseconds: Schema.Finite }),
]);

export const EffectSchema = Schema.Union([
  HighpassSchema,
  LowpassSchema,
  GainSchema,
  DriveSchema,
  kind("reverb")({
    left: Schema.String,
    right: Schema.OptionFromNullOr(Schema.String),
    predelayMilliseconds: OptionalNumber,
    mix: OptionalShare,
  }),
  kind("delay")({
    time: DelayTimeSchema,
    feedback: Share,
    lowpassHertz: OptionalNumber,
    highpassHertz: OptionalNumber,
    pingpong: OptionalShare,
  }),
  kind("comp")({
    thresholdDecibels: Schema.Finite,
    ratio: Schema.Finite,
    attackMilliseconds: OptionalNumber,
    releaseMilliseconds: OptionalNumber,
    makeupDecibels: OptionalNumber,
  }),
  kind("chorus")({
    depthMilliseconds: Schema.Finite,
    rateHertz: Schema.Finite,
    mix: Share,
    baseMilliseconds: OptionalNumber,
  }),
  kind("width")({ amount: Share, monoBelowHertz: OptionalNumber }),
  kind("limit")({
    ceilingDecibels: Schema.Finite,
    lookaheadMilliseconds: OptionalNumber,
    releaseMilliseconds: OptionalNumber,
  }),
  kind("phaser")({
    rateHertz: Schema.Finite,
    lowHertz: Schema.Finite,
    highHertz: Schema.Finite,
    feedback: OptionalShare,
    mix: OptionalShare,
  }),
  kind("tremolo")({ rateHertz: Schema.Finite, depth: Share }),
]);

export type Effect = typeof EffectSchema.Type;

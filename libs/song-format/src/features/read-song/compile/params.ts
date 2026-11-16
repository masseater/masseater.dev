import { Match, Option, pipe } from "effect";

import type { Effect, PlayParam } from "#/entities/song/sound.ts";
import { ticksOf } from "#/shared/lib/ticks.ts";
import {
  decibelsOf,
  hertzOf,
  millisecondsOf,
  ratioOf,
  semitonesOf,
  shareOf,
} from "#/shared/lib/units.ts";
import type {
  Chorus,
  Comp,
  Delay,
  Effect as EffectNode,
  Highpass,
  Limit,
  Lowpass,
  Phaser,
  PlayParam as PlayParamNode,
  Reverb,
  Send,
  Width,
} from "#generated/langium/ast.ts";

import type { From } from "./problem.ts";

const UNITY = 1;
const NONE = 0;

const optional =
  <Value>(read: (text: string) => Value) =>
  (text: string | undefined): Option.Option<Value> =>
    pipe(Option.fromNullishOr(text), Option.map(read));

const optionalMilliseconds = optional(millisecondsOf);
const optionalHertz = optional(hertzOf);
const optionalShare = optional(shareOf);

export const sendOf: From<Send, { readonly bus: string; readonly amount: number }> = (send) => ({
  bus: send.bus.$refText,
  amount: shareOf(send.amount),
});

const highpassOf: From<Highpass, Effect & PlayParam> = (node) => ({
  kind: "highpass",
  hertz: hertzOf(node.frequency),
  resonance: Option.fromNullishOr(node.resonance),
});

const lowpassOf: From<Lowpass, Effect & PlayParam> = (node) => ({
  kind: "lowpass",
  hertz: hertzOf(node.frequency),
  targetHertz: optionalHertz(node.target),
  resonance: Option.fromNullishOr(node.resonance),
});

export const playParamOf: From<PlayParamNode, PlayParam> = (node) =>
  Match.value(node).pipe(
    Match.discriminatorsExhaustive("$type")({
      Semi: (semi): PlayParam => ({ kind: "semi", semitones: semitonesOf(semi.amount) }),
      Length: (length): PlayParam => ({
        kind: "length",
        milliseconds: millisecondsOf(length.time),
      }),
      Attack: (attack): PlayParam => ({
        kind: "attack",
        milliseconds: millisecondsOf(attack.time),
      }),
      Release: (release): PlayParam => ({
        kind: "release",
        milliseconds: millisecondsOf(release.time),
      }),
      Decay: (decay): PlayParam => ({ kind: "decay", milliseconds: millisecondsOf(decay.time) }),
      Offset: (offset): PlayParam => ({
        kind: "offset",
        milliseconds: millisecondsOf(offset.time),
      }),
      Highpass: highpassOf,
      Lowpass: lowpassOf,
      Gain: (gain): PlayParam => ({ kind: "gain", decibels: decibelsOf(gain.amount) }),
      Pan: (pan): PlayParam => ({ kind: "pan", amount: shareOf(pan.amount) }),
      Drive: (drive): PlayParam => ({ kind: "drive", amount: drive.amount }),
      Send: (send): PlayParam => ({ kind: "send", ...sendOf(send) }),
      Reverse: (): PlayParam => ({ kind: "reverse" }),
    }),
  );

const delayTimeOf: From<Delay, Extract<Effect, { readonly kind: "delay" }>["time"]> = (delay) =>
  pipe(
    Option.fromNullishOr(delay.beats),
    Option.flatMap(ticksOf),
    Option.match({
      onNone: () => ({
        kind: "milliseconds" as const,
        milliseconds: pipe(
          optionalMilliseconds(delay.time),
          Option.getOrElse(() => NONE),
        ),
      }),
      onSome: (ticks) => ({ kind: "ticks" as const, ticks }),
    }),
  );

const ratioValueOf = (text: string): number =>
  pipe(
    ratioOf(text),
    Option.filter((ratio) => ratio.right !== NONE),
    Option.match({ onNone: () => UNITY, onSome: (ratio) => ratio.left / ratio.right }),
  );

const compOf: From<Comp, Effect> = (comp) => ({
  kind: "comp",
  thresholdDecibels: decibelsOf(comp.threshold),
  ratio: ratioValueOf(comp.ratio),
  attackMilliseconds: optionalMilliseconds(comp.attack),
  releaseMilliseconds: optionalMilliseconds(comp.release),
  makeupDecibels: optional(decibelsOf)(comp.makeup),
});

const limitOf: From<Limit, Effect> = (limit) => ({
  kind: "limit",
  ceilingDecibels: decibelsOf(limit.ceiling),
  lookaheadMilliseconds: optionalMilliseconds(limit.lookahead),
  releaseMilliseconds: optionalMilliseconds(limit.release),
});

const widthOf: From<Width, Effect> = (width) => ({
  kind: "width",
  amount: shareOf(width.amount),
  monoBelowHertz: optionalHertz(width.monoBelow),
});

const chorusOf: From<Chorus, Effect> = (chorus) => ({
  kind: "chorus",
  depthMilliseconds: millisecondsOf(chorus.depth),
  rateHertz: hertzOf(chorus.rate),
  mix: shareOf(chorus.mix),
  baseMilliseconds: optionalMilliseconds(chorus.base),
});

const phaserOf: From<Phaser, Effect> = (phaser) => ({
  kind: "phaser",
  rateHertz: hertzOf(phaser.rate),
  lowHertz: hertzOf(phaser.low),
  highHertz: hertzOf(phaser.high),
  feedback: optionalShare(phaser.feedback),
  mix: optionalShare(phaser.mix),
});

const reverbOf: From<Reverb, Effect> = (reverb) => ({
  kind: "reverb",
  left: reverb.left,
  right: Option.fromNullishOr(reverb.right),
  predelayMilliseconds: optionalMilliseconds(reverb.predelay),
  mix: optionalShare(reverb.mix),
});

const delayOf: From<Delay, Effect> = (delay) => ({
  kind: "delay",
  time: delayTimeOf(delay),
  feedback: shareOf(delay.feedback),
  lowpassHertz: optionalHertz(delay.lowpass),
  highpassHertz: optionalHertz(delay.highpass),
  pingpong: optionalShare(delay.pingpong),
});

export const effectOf: From<EffectNode, Effect> = (node) =>
  Match.value(node).pipe(
    Match.discriminatorsExhaustive("$type")({
      Highpass: highpassOf,
      Lowpass: lowpassOf,
      Gain: (gain): Effect => ({ kind: "gain", decibels: decibelsOf(gain.amount) }),
      Drive: (drive): Effect => ({ kind: "drive", amount: drive.amount }),
      Reverb: reverbOf,
      Delay: delayOf,
      Comp: compOf,
      Chorus: chorusOf,
      Width: widthOf,
      Limit: limitOf,
      Phaser: phaserOf,
      Tremolo: (tremolo): Effect => ({
        kind: "tremolo",
        rateHertz: hertzOf(tremolo.rate),
        depth: shareOf(tremolo.depth),
      }),
    }),
  );

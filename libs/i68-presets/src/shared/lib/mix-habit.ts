import { MIXER_PARAMETERS } from "@r_masseater/fumx-parser";
import { Match, Schema } from "effect";

const Track = Schema.String;

export const MoveSchema = Schema.Struct({
  type: Schema.Literal("move"),
  track: Track,
  parameter: Schema.Literals(MIXER_PARAMETERS),
  direction: Schema.Literals(["up", "down"]),
  edge: Schema.Literals(["before", "after"]),
});

export const LevelSchema = Schema.Struct({
  type: Schema.Literal("level"),
  track: Track,
  decibels: Schema.Finite,
});

export const PanSchema = Schema.Struct({
  type: Schema.Literal("pan"),
  track: Track,
  pan: Schema.Finite,
});

export const SendSchema = Schema.Struct({
  type: Schema.Literal("send"),
  track: Track,
  bus: Schema.String,
  amount: Schema.Finite,
});

export const MixHabitSchema = Schema.Union([MoveSchema, LevelSchema, PanSchema, SendSchema]);

export type MixHabit = typeof MixHabitSchema.Type;

const PERCENT = 100;

const percentOf = (share: number): string => `${String(Math.round(share * PERCENT))}%`;

const ARROWS = { up: "↑", down: "↓" } as const;

export const mixKeyOf: (habit: MixHabit) => string = Match.type<MixHabit>().pipe(
  Match.discriminatorsExhaustive("type")({
    move: (move) =>
      `${move.track} ${move.parameter} ${ARROWS[move.direction]} ${move.edge} section`,
    level: (level) => `${level.track} volume ${String(level.decibels)}dB from loudest`,
    pan: (pan) => `${pan.track} pan ${percentOf(pan.pan)}`,
    send: (send) => `${send.track} send ${send.bus} ${percentOf(send.amount)}`,
  }),
);

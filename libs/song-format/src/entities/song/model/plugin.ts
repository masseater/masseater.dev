import { Schema } from "effect";

import { Name, Share, Ticks, kind } from "./fields.ts";

const PluginValueSchema = Schema.Union([
  kind("number")({ value: Schema.Finite }),
  kind("decibels")({ value: Schema.Finite }),
  kind("share")({ value: Share }),
  kind("hertz")({ value: Schema.Finite }),
  kind("milliseconds")({ value: Schema.Finite }),
  kind("semitones")({ value: Schema.Finite }),
  kind("ticks")({ value: Ticks }),
  kind("pitch")({ midi: Schema.Int, cents: Schema.Finite }),
  kind("text")({ value: Schema.String }),
  kind("flag")({ value: Schema.Boolean }),
]);

export type PluginValue = typeof PluginValueSchema.Type;

const PluginTypeSchema = Schema.Literals([
  "number",
  "pitch",
  "duration",
  "decibels",
  "percent",
  "hertz",
  "time",
  "semitones",
  "string",
  "bool",
]);

const PluginParamSchema = Schema.Struct({
  name: Name,
  type: PluginTypeSchema,
  default: Schema.OptionFromNullOr(PluginValueSchema),
});

export const PluginSchema = Schema.Struct({
  name: Name,
  module: Schema.String,
  params: Schema.Array(PluginParamSchema),
});

export type Plugin = typeof PluginSchema.Type;

export const PluginUseSchema = kind("plugin")({
  plugin: Name,
  module: Schema.String,
  arguments: Schema.Array(Schema.Struct({ name: Name, value: PluginValueSchema })),
});

export type PluginUse = typeof PluginUseSchema.Type;

import { FORMATS } from "@masseater.dev/video-kit/script";
import { Schema } from "effect";

const FormatSchema = Schema.Literals(FORMATS);
const Formats = Schema.Array(FormatSchema);
const Lines = Schema.Array(Schema.String);
const Seconds = Schema.optionalKey(Schema.Finite);

const CutSchema = Schema.Struct({
  id: Schema.String,
  say: Lines,
  hold: Seconds,
  formats: Schema.optionalKey(Formats),
  voice: Schema.optionalKey(Schema.Finite),
});

const LengthSchema = Schema.Struct({ vertical: Seconds, horizontal: Seconds });
const BgmSchema = Schema.Struct({
  url: Schema.String,
  credit: Schema.String,
  page: Schema.optionalKey(Schema.String),
});
const Readings = Schema.Record(Schema.String, Schema.String);
const Cuts = Schema.Array(CutSchema);

const VideoScriptSchema = Schema.Struct({
  title: Schema.String,
  formats: Formats,
  length: LengthSchema,
  voice: Schema.Finite,
  readings: Readings,
  bgm: Schema.optionalKey(BgmSchema),
  images: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  cuts: Cuts,
});

/** @internal */
export const ScriptModule = Schema.Struct({ script: VideoScriptSchema });

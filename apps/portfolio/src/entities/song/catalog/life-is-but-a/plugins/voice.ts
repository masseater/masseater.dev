import type {
  InstrumentPlugin,
  Voice,
  VoiceRequest,
} from "@masseater.dev/fumx-studio/plugin/plugin";
import { Option } from "effect";

import { flagIn, keyOf, textIn } from "./lib/args.ts";
import { spokenOf, wordIn } from "./voice/words.ts";

const cache = new Map<string, Voice>();

const voiceOf = ({ args, samples }: VoiceRequest): Voice => {
  const source = samples[Option.getOrElse(textIn(args)("source"), () => "")] ?? new Float32Array();
  if (flagIn(args)("spoken")) {
    return { sound: spokenOf(source), label: "spoken", midi: Option.none() };
  }
  return wordIn(args)(source);
};

export const plugin: InstrumentPlugin = {
  kind: "instrument",
  voice: (request) => cache.getOrInsertComputed(keyOf(request.args), () => voiceOf(request)),
};

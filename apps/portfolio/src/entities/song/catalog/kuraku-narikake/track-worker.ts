import type { Logged } from "@masseater.dev/fumx-studio/studio/placement";
import { Option, Schema, pipe } from "effect";

import { kurakuOf } from "./engine/kuraku.ts";
import type { Kuraku } from "./engine/kuraku.ts";
import { clipsOf } from "./engine/score.ts";
import { trackOf } from "./engine/track.ts";
import { AskSchema } from "./track-messages.ts";
import type { Ask, Reply } from "./track-messages.ts";

const FIRST = 0;

const log: Logged[] = [];
const held: { kuraku: Option.Option<Kuraku> } = { kuraku: Option.none() };

const askOf = Schema.decodeUnknownOption(AskSchema);

const reply = (message: Reply, transfer: readonly ArrayBuffer[]): void => {
  globalThis.postMessage(message, { transfer: [...transfer] });
};

const built =
  (name: string) =>
  (kuraku: Kuraku): void => {
    const stem = trackOf(kuraku)(name);
    const entries = log.splice(FIRST);
    reply({ name, stem, entries }, [stem.data.buffer, stem.segments.buffer]);
  };

const answer = (ask: Ask): void => {
  if ("samples" in ask) {
    held.kuraku = Option.some(
      kurakuOf({
        samples: ask.samples,
        table: ask.table,
        log: Option.some(log),
        clips: clipsOf(ask.clips),
      }),
    );
    reply({ ready: true }, []);
    return;
  }
  pipe(held.kuraku, Option.map(built(ask.name)));
};

globalThis.addEventListener("message", ({ data }) => {
  pipe(askOf(data), Option.map(answer));
});

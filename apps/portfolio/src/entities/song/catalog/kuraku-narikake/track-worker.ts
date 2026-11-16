import { Option, Schema, pipe } from "effect";

import type { Logged } from "#/entities/song/model/program.ts";

import { engineModule } from "./program/engine.js";
import { songModule } from "./program/song.js";
import type { Session } from "./program/song.js";
import { AskSchema } from "./track-messages.ts";
import type { Ask, Reply } from "./track-messages.ts";

const FIRST = 0;

const engine = engineModule();
const program = songModule();
const log: (Logged | null)[] = [];
const held: { session: Option.Option<Session> } = { session: Option.none() };

const askOf = Schema.decodeUnknownOption(AskSchema);

const reply: (message: Reply, transfer: readonly ArrayBuffer[]) => void = (message, transfer) => {
  globalThis.postMessage(message, { transfer: [...transfer] });
};

const built =
  (name: string) =>
  (session: Session): void => {
    const stem = session.track(name);
    const entries = log.splice(FIRST);
    reply({ name, stem, entries }, [stem.data.buffer, stem.segs.buffer]);
  };

const answer = (ask: Ask): void => {
  if ("samples" in ask) {
    held.session = Option.some(program.open(engine, ask.samples, ask.table, { log, edits: false }));
    reply({ ready: true }, []);
    return;
  }
  pipe(held.session, Option.map(built(ask.name)));
};

globalThis.addEventListener("message", ({ data }) => {
  pipe(askOf(data), Option.map(answer));
});

import type { Song } from "@r_masseater/fumx-parser";
import { Effect, Function as Fn, Option, Schema, pipe } from "effect";

import { renderPart } from "#/features/render-song/index.ts";
import type { Session } from "#/features/render-song/index.ts";
import { PartAskSchema } from "#/shared/lib/plugin/parts.ts";
import type { PartAsk, PartReply } from "#/shared/lib/plugin/parts.ts";
import type { Plugins } from "#/shared/lib/plugin/plugin.ts";
import type { Ledger, Logged } from "#/shared/lib/studio/placement.ts";

const FIRST = 0;

export interface PartSource {
  readonly song: Song;
  readonly plugins: Plugins;
}

export type PartSources = (song: string) => Promise<PartSource>;

interface Collected {
  readonly ledger: Ledger;
  readonly taken: () => readonly Logged[];
}

interface Held {
  readonly get: () => Option.Option<readonly [Song, Session]>;
  readonly set: (song: Song, session: Session) => void;
}

const askOf = Schema.decodeUnknownOption(PartAskSchema);

const reply = (message: PartReply, transfer: readonly ArrayBuffer[]): void => {
  globalThis.postMessage(message, { transfer: [...transfer] });
};

const collected = (): Collected => {
  const log: Logged[] = [];
  return { ledger: log, taken: () => log.splice(FIRST) };
};

const heldSession = (): Held => {
  const held: { session: Option.Option<readonly [Song, Session]> } = { session: Option.none() };
  return {
    get: () => held.session,
    set: (song, session): void => {
      held.session = Option.some([song, session]);
    },
  };
};

const answered =
  (sources: PartSources) =>
  (held: Held, log: Collected) =>
  (ask: PartAsk): Effect.Effect<void> => {
    if ("samples" in ask) {
      return Effect.map(
        Effect.promise(() => sources(ask.song)),
        ({ song, plugins }) => {
          held.set(song, {
            samples: ask.samples,
            plugins,
            log: log.ledger,
            progress: Fn.constVoid,
            parts: Option.none(),
          });
          reply({ ready: true }, []);
        },
      );
    }
    return Option.match(held.get(), {
      onNone: () => Effect.void,
      onSome: ([song, session]) =>
        Effect.map(Effect.orDie(renderPart(song, session, ask.key)), (stem) => {
          reply({ key: ask.key, stem, logged: log.taken() }, [
            stem.data.buffer,
            stem.segments.buffer,
          ]);
        }),
    });
  };

export const serveParts = (sources: PartSources): void => {
  const answer = answered(sources)(heldSession(), collected());
  globalThis.addEventListener("message", ({ data }) => {
    pipe(
      askOf(data),
      Option.map((ask) => Effect.runFork(answer(ask))),
    );
  });
};

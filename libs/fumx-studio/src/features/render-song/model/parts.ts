import { Array as Arr, Effect, Option } from "effect";

import type { PartDone } from "#/shared/lib/plugin/parts.ts";
import type { MixPlugin, MixRequest } from "#/shared/lib/plugin/plugin.ts";
import { breathe } from "#/shared/lib/studio/breathe.ts";
import type { Logged } from "#/shared/lib/studio/placement.ts";
import type { Stem as Packed } from "#/shared/lib/studio/stem.ts";

import type { Session } from "./context.ts";
import { Unplayable } from "./unplayable.ts";

export const partOf =
  (plugin: MixPlugin) =>
  (request: MixRequest): ((key: string) => Packed) =>
    Option.getOrThrowWith(Option.fromUndefinedOr(plugin.part), () =>
      Unplayable.make({ part: "part" }),
    )(request);

const NOTHING_LOGGED: readonly Logged[] = [];

const partsHere =
  (plugin: MixPlugin, request: () => MixRequest) =>
  (keys: readonly string[]) =>
  (done: (part: PartDone) => void): Effect.Effect<void> => {
    if (!Arr.isReadonlyArrayNonEmpty(keys)) {
      return Effect.void;
    }
    const part = partOf(plugin)(request());
    return Effect.forEach(
      keys,
      (key) =>
        Effect.andThen(
          breathe,
          Effect.sync(() => {
            done({ key, stem: part(key), logged: NOTHING_LOGGED });
          }),
        ),
      { concurrency: 1, discard: true },
    );
  };

const inOrder = (
  keys: readonly string[],
  done: (part: PartDone) => void,
): ((part: PartDone) => void) => {
  const waiting = new Map<string, PartDone>();
  const at = { next: 0 };
  const due = (): Option.Option<PartDone> =>
    Option.flatMap(Arr.get(keys, at.next), (key) => Option.fromUndefinedOr(waiting.get(key)));
  const flushed = (): void => {
    Option.map(due(), (ready) => {
      waiting.delete(ready.key);
      at.next += 1;
      done(ready);
      flushed();
    });
  };
  return (part) => {
    waiting.set(part.key, part);
    flushed();
  };
};

export const partsOf =
  (session: Session) =>
  (plugin: MixPlugin, request: () => MixRequest): MixRequest["parts"] =>
  (keys) =>
  (done) => {
    const here = partsHere(plugin, request);
    const ordered = inOrder(keys, (part) => {
      session.log.push(...part.logged);
      done(part.key, part.stem);
    });
    return Option.match(session.parts, {
      onNone: () => here(keys)(ordered),
      onSome: (run) => Effect.flatMap(run(keys)(ordered), (left) => here(left)(ordered)),
    });
  };

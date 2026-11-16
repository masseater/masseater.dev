import type { Opened } from "@masseater.dev/media-notes-protocol";
import { Effect, Option } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";

import { openedAtom } from "#/entities/media/index.ts";
import { chooseFile, openFile, openLink } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/runtime.ts";

/** @internal */
export const linkAtom = Atom.make("").pipe(Atom.keepAlive);

const shown = (
  opened: Option.Option<Opened>,
): Effect.Effect<void, never, AtomRegistry.AtomRegistry> =>
  AtomRegistry.AtomRegistry.pipe(
    Effect.flatMap((registry) =>
      Effect.sync(() => {
        if (Option.isSome(opened)) {
          registry.set(openedAtom, opened);
        }
      }),
    ),
  );

/** @internal */
export const openLinkAtom = runtime.fn((link: string) =>
  openLink(link).pipe(Effect.asSome, Effect.flatMap(shown)),
);

/** @internal */
export const openFileAtom = runtime.fn((path: string) =>
  openFile(path).pipe(Effect.asSome, Effect.flatMap(shown)),
);

/** @internal */
export const chooseFileAtom = runtime.fn(() => chooseFile.pipe(Effect.flatMap(shown)));

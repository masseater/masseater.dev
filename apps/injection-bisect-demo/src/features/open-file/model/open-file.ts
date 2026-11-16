import { DEFAULT_READERS, readDocument } from "@r_masseater/injection-bisect";
import type { Document, Unreadable } from "@r_masseater/injection-bisect";
import { Effect, MutableRef, Option, String as Str } from "effect";
import type { Fiber } from "effect";

import { openedOf, COUNT, MAX_CHARS } from "#/entities/inspection/index.ts";
import type { Opening } from "#/entities/inspection/index.ts";
import { COPY } from "#/shared/config/index.ts";

const FIRST = 0;

export interface Picked {
  readonly name: string;
  readonly load: () => Promise<ArrayBuffer>;
}

export interface Draft {
  readonly text: string;
  readonly format: string;
}

export interface Sink {
  readonly opening: (opening: Opening) => void;
  readonly draft: (draft: Draft) => void;
}

interface Kept {
  readonly text: string;
  readonly unreadable: readonly Unreadable[];
}

const documentOf = ({ name, load }: Picked): Effect.Effect<Document, string> =>
  Effect.tryPromise({ try: load, catch: String }).pipe(
    Effect.flatMap((buffer) =>
      readDocument({ bytes: new Uint8Array(buffer), name, readers: DEFAULT_READERS }).pipe(
        Effect.mapError(({ reason }) => reason),
      ),
    ),
  );

const keptOf = (name: string, { text, unreadable = [] }: Document): Kept => {
  if (text.length <= MAX_CHARS) {
    return { text, unreadable };
  }
  return {
    text: Str.slice(FIRST, MAX_CHARS)(text),
    unreadable: [...unreadable, { name, reason: COPY.beyond(COUNT.format(MAX_CHARS)) }],
  };
};

const failedOf =
  (name: string) =>
  (reason: string): Opening => ({ status: "failed", name, reason });

export const pickedOf = (files: Readonly<Pick<FileList, "item">> | null): Option.Option<Picked> =>
  Option.fromNullishOr(files).pipe(
    Option.flatMapNullishOr((list) => list.item(FIRST)),
    Option.map((file): Picked => ({
      name: file.name,
      load: (): Promise<ArrayBuffer> => file.arrayBuffer(),
    })),
  );

const reading = (picked: Picked, sink: Sink): Effect.Effect<void> =>
  documentOf(picked).pipe(
    Effect.match({
      onFailure: failedOf(picked.name),
      onSuccess: (document) => {
        const { text, unreadable } = keptOf(picked.name, document);
        sink.draft({ text, format: document.format });
        return openedOf(picked.name)(unreadable);
      },
    }),
    Effect.catchDefect((defect) => Effect.succeed(failedOf(picked.name)(String(defect)))),
    Effect.map(sink.opening),
  );

export const openerOf = (sink: Sink): ((picked: Picked) => void) => {
  const running = MutableRef.make(Option.none<Fiber.Fiber<void>>());
  return (picked) => {
    Option.map(MutableRef.get(running), (fiber) => {
      fiber.interruptUnsafe();
    });
    sink.opening({ status: "reading", name: picked.name });
    const fiber = Effect.runFork(reading(picked, sink));
    MutableRef.set(running, Option.some(fiber));
  };
};

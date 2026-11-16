import { Array as Arr, Effect, Match } from "effect";

import { InvalidRecord } from "#/shared/api/index.ts";
import type { StoreFailure } from "#/shared/api/index.ts";
import { StorageFailed } from "#/shared/db/index.ts";

export type Place = Readonly<{ index: number; written: readonly string[] }>;

const writtenNote = (written: readonly string[]): string =>
  Arr.match(written, {
    onEmpty: () => "",
    onNonEmpty: (refs) => ` Already written: ${Arr.join(refs, ", ")}. Do not send them again.`,
  });

const locatedMessage =
  ({ index, written }: Place) =>
  (message: string): string =>
    `records[${index}]: ${message}${writtenNote(written)}`;

export const locating =
  (place: Place) =>
  <Value>(write: Effect.Effect<Value, StoreFailure>): Effect.Effect<Value, StoreFailure> => {
    const locate = locatedMessage(place);
    return write.pipe(
      Effect.mapError((failure) =>
        Match.valueTags(failure, {
          InvalidRecord: ({ message }): StoreFailure =>
            InvalidRecord.make({ message: locate(message) }),
          StorageFailed: ({ message }): StoreFailure =>
            StorageFailed.make({ message: locate(message) }),
          MemoryNotFound: (): StoreFailure => failure,
          RecordNotFound: (): StoreFailure => failure,
          RevisionNotFound: (): StoreFailure => failure,
        }),
      ),
    );
  };

import { Array, Effect, FileSystem, Option, Path, pipe } from "effect";

import { digestOfFile } from "./content-digest.ts";

const PARTIAL = ".part";
const ORIGINAL = 1;
const NEXT = 1;

interface Placement<Failure, Requirements> {
  readonly folder: string;
  readonly name: string;
  readonly size: number;
  readonly digest: Effect.Effect<string, Failure, Requirements>;
  readonly write: (partial: string) => Effect.Effect<void, Failure, Requirements>;
}

interface Slot {
  readonly folder: string;
  readonly name: string;
  readonly copy: number;
}

interface Vacancy {
  readonly target: string;
  readonly sameSize: readonly string[];
}

const candidate = (path: Path.Path, { folder, name, copy }: Slot): string => {
  if (copy === ORIGINAL) {
    return path.join(folder, name);
  }
  const { name: stem, ext } = path.parse(name);
  return path.join(folder, `${stem} (${copy.toString()})${ext}`);
};

const sizeOf = Effect.fn("sizeOf")(function* sizeOfFile(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.stat(file).pipe(
    Effect.map((info) => Option.some(Number(info.size))),
    Effect.orElseSucceed(() => Option.none<number>()),
  );
});

const vacancy = Effect.fn("vacancy")(function* findVacancy(
  slot: Slot,
  size: number,
  sameSize: readonly string[],
): Effect.fn.Return<Vacancy, never, FileSystem.FileSystem | Path.Path> {
  const path = yield* Path.Path;
  const target = candidate(path, slot);
  const existing = yield* sizeOf(target);
  if (Option.isNone(existing)) {
    return { target, sameSize };
  }
  const next = { ...slot, copy: slot.copy + NEXT };
  if (existing.value === size) {
    return yield* vacancy(next, size, [...sameSize, target]);
  }
  return yield* vacancy(next, size, sameSize);
});

const isAlreadyPlaced = Effect.fn("isAlreadyPlaced")(function* isAlreadyPlaced<
  Failure,
  Requirements,
>(sameSize: readonly string[], digest: Effect.Effect<string, Failure, Requirements>) {
  if (Array.isReadonlyArrayEmpty(sameSize)) {
    return false;
  }
  const incoming = yield* digest;
  const same = yield* Effect.findFirst(sameSize, (file) =>
    digestOfFile(file).pipe(Effect.map((placed) => placed === incoming)),
  );
  return Option.isSome(same);
});

/** @internal */
const placeFile = Effect.fn("placeFile")(function* placeFileInFolder<Failure, Requirements>({
  folder,
  name,
  size,
  digest,
  write,
}: Placement<Failure, Requirements>) {
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.makeDirectory(folder, { recursive: true });
  const { target, sameSize } = yield* vacancy({ folder, name, copy: ORIGINAL }, size, []);
  const placed = yield* isAlreadyPlaced(sameSize, digest);
  if (placed) {
    return false;
  }
  const partial = `${target}${PARTIAL}`;
  yield* write(partial).pipe(
    Effect.andThen(fileSystem.rename(partial, target)),
    Effect.onError(() => pipe(fileSystem.remove(partial), Effect.ignore)),
  );
  return true;
});

export { placeFile };
export type { Placement };

import { Effect, FileSystem, Option, Path, pipe } from "effect";

const PARTIAL = ".part";
const ORIGINAL = 1;
const NEXT = 1;

interface Placement<Failure, Requirements> {
  readonly folder: string;
  readonly name: string;
  readonly size: number;
  readonly write: (partial: string) => Effect.Effect<void, Failure, Requirements>;
}

interface Slot {
  readonly folder: string;
  readonly name: string;
  readonly copy: number;
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

const freeTarget = Effect.fn("freeTarget")(function* findFreeTarget(
  slot: Slot,
  size: number,
): Effect.fn.Return<Option.Option<string>, never, FileSystem.FileSystem | Path.Path> {
  const path = yield* Path.Path;
  const target = candidate(path, slot);
  const existing = yield* sizeOf(target);
  if (Option.isNone(existing)) {
    return Option.some(target);
  }
  if (existing.value === size) {
    return Option.none();
  }
  return yield* freeTarget({ ...slot, copy: slot.copy + NEXT }, size);
});

/** @internal */
const placeFile = Effect.fn("placeFile")(function* placeFileInFolder<Failure, Requirements>({
  folder,
  name,
  size,
  write,
}: Placement<Failure, Requirements>) {
  const fileSystem = yield* FileSystem.FileSystem;
  yield* fileSystem.makeDirectory(folder, { recursive: true });
  const target = yield* freeTarget({ folder, name, copy: ORIGINAL }, size);
  if (Option.isNone(target)) {
    return false;
  }
  const partial = `${target.value}${PARTIAL}`;
  yield* write(partial).pipe(
    Effect.andThen(fileSystem.rename(partial, target.value)),
    Effect.onError(() => pipe(fileSystem.remove(partial), Effect.ignore)),
  );
  return true;
});

export { placeFile };
export type { Placement };

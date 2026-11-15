import { Effect, FileSystem, HashMap, Option, Stream, pipe } from "effect";
import type { PlatformError } from "effect";
import type { ParsedTarEntry } from "modern-tar";

import { skip, tarEntries } from "./tar-stream.ts";
import { UnityPackageUnreadable } from "./unity-package-unreadable.ts";

const ASSET_NAME = /^(?:\.\/)?(?<guid>[0-9a-f]{32})\/asset$/u;

const assetGuidOf = ({ header }: ParsedTarEntry): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(ASSET_NAME.exec(header.name)),
    Option.filter(() => header.type === "file"),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(({ guid }) => Option.fromNullishOr(guid)),
  );

const writeBody = (
  path: string,
  entry: ParsedTarEntry,
  destination: string,
): Effect.Effect<
  void,
  UnityPackageUnreadable | PlatformError.PlatformError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* writeAsset() {
    const fileSystem = yield* FileSystem.FileSystem;
    yield* Stream.fromReadableStream({
      evaluate: () => entry.body,
      onError: (cause) => UnityPackageUnreadable.make({ path, cause }),
    }).pipe(Stream.run(fileSystem.sink(destination)));
  });

/** @internal */
const extractAssets = Effect.fn("extractAssets")(function* extractAssets({
  path,
  destinations,
}: {
  readonly path: string;
  readonly destinations: HashMap.HashMap<string, string>;
}) {
  const entries = yield* tarEntries(path);
  yield* entries.pipe(
    Stream.mapEffect((entry) =>
      Option.match(
        Option.flatMap(assetGuidOf(entry), (guid) => HashMap.get(destinations, guid)),
        {
          onNone: () => skip(entry),
          onSome: (destination) => writeBody(path, entry, destination),
        },
      ),
    ),
    Stream.runDrain,
  );
});

export { extractAssets };

import { Effect, FileSystem, HashMap, Option, Stream, pipe } from "effect";
import type { PlatformError } from "effect";
import type { Tar } from "effect/encoding";

import { tarEntries } from "./tar-stream.ts";
import type { UnityPackageUnreadable } from "./unity-package-unreadable.ts";

const ASSET_NAME = /^(?:\.\/)?(?<guid>[0-9a-f]{32})\/asset$/u;

const assetGuidOf = ({ header }: Tar.Entry<UnityPackageUnreadable>): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(ASSET_NAME.exec(header.path)),
    Option.filter(() => header.type === "File"),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(({ guid }) => Option.fromNullishOr(guid)),
  );

const writeBody = (
  entry: Tar.Entry<UnityPackageUnreadable>,
  destination: string,
): Effect.Effect<
  void,
  UnityPackageUnreadable | PlatformError.PlatformError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* writeAsset() {
    const fileSystem = yield* FileSystem.FileSystem;
    yield* Stream.run(entry.body, fileSystem.sink(destination));
  });

/** @internal */
export const extractAssets = Effect.fn("extractAssets")(function* extractAssets({
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
          onNone: () => Effect.void,
          onSome: (destination) => writeBody(entry, destination),
        },
      ),
    ),
    Stream.runDrain,
  );
});

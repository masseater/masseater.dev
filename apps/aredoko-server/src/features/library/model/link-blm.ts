import type { BoothItem } from "@masseater.dev/aredoko-protocol";
import type { Cause } from "effect";
import { Array, Effect, HashMap, HashSet, Option, Path, Ref, Schema, String, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { fetchItem, itemUrl } from "#entities/booth";
import { decodeRows } from "#shared/sql";

import { Blm } from "./blm.ts";
import type { BlmItem, BlmLibrary } from "./blm.ts";
import { linkBooth } from "./link-booth.ts";

const PARENT = "..";
const NO_PRICE = "";

const UnlinkedRow = Schema.Struct({ id: Schema.Int, path: Schema.String });

type Requirements = Effect.Services<ReturnType<typeof linkOne>>;

interface Pending {
  readonly packageId: number;
  readonly item: BlmItem;
}

const isFolderName =
  (path: Path.Path) =>
  (folder: string): boolean =>
    String.isNonEmpty(folder) && folder !== PARENT && !path.isAbsolute(folder);

const folderOf =
  (path: Path.Path, itemDirectory: string) =>
  (packagePath: string): Option.Option<string> =>
    pipe(
      path.relative(itemDirectory, packagePath),
      String.split(path.sep),
      Array.head,
      Option.filter(isFolderName(path)),
    );

const fromBlm = ({ boothId, name, shop }: BlmItem): Option.Option<typeof BoothItem.Type> =>
  pipe(
    name,
    Option.map((itemName) => ({
      id: boothId,
      url: itemUrl(boothId),
      name: itemName,
      shop: Option.getOrElse(shop, () => NO_PRICE),
      price: NO_PRICE,
      tags: [],
    })),
  );

const offline =
  (item: BlmItem) =>
  (cause: Cause.Cause<unknown>): Effect.Effect<typeof BoothItem.Type, Cause.NoSuchElementError> =>
    pipe(
      fromBlm(item),
      Effect.fromOption,
      Effect.tap(() => Effect.logDebug("BOOTH item unavailable", item.boothId, cause)),
    );

const linkOne = Effect.fn("linkOne")(function* linkFromBlmItem({ packageId, item }: Pending) {
  const boothItem = yield* fetchItem(itemUrl(item.boothId)).pipe(Effect.catchCause(offline(item)));
  yield* linkBooth({ packageId, item: boothItem });
});

const pendingIn = Effect.fn("pendingIn")(function* pendingPackages(
  { itemDirectory, items }: BlmLibrary,
  done: HashSet.HashSet<number>,
) {
  const sql = yield* SqlClient.SqlClient;
  const path = yield* Path.Path;
  const rows = yield* decodeRows(UnlinkedRow)(
    sql`select id, path from packages where booth_item_id is null and kind in ('unitypackage', 'files')`,
  );
  const byFolder = HashMap.fromIterable(
    pipe(
      items,
      Array.map((item) => [item.folder, item] as const),
    ),
  );
  const folderIn = folderOf(path, itemDirectory);
  const pendingOf = ({ id, path: packagePath }: typeof UnlinkedRow.Type): Option.Option<Pending> =>
    pipe(
      folderIn(packagePath),
      Option.flatMap((folder) => HashMap.get(byFolder, folder)),
      Option.map((item) => ({ packageId: id, item })),
    );
  return pipe(
    rows,
    Array.filter(({ id }) => !HashSet.has(done, id)),
    Array.map(pendingOf),
    Array.getSomes,
  );
});

const linkablePaths = Effect.fn("linkablePaths")(function* linkablePackagePaths() {
  const blm = yield* Blm;
  const path = yield* Path.Path;
  const found = yield* blm.library;
  return pipe(
    found,
    Option.match({
      onNone: () => (): boolean => false,
      onSome: ({ itemDirectory, items }) => {
        const folders = HashSet.fromIterable(
          pipe(
            items,
            Array.map(({ folder }) => folder),
          ),
        );
        const folderIn = folderOf(path, itemDirectory);
        return (packagePath: string): boolean =>
          pipe(
            folderIn(packagePath),
            Option.exists((folder) => HashSet.has(folders, folder)),
          );
      },
    }),
  );
});

const linkLogged = (one: Pending): Effect.Effect<void, never, Requirements> =>
  linkOne(one).pipe(
    Effect.catchCause((cause) => Effect.logWarning("BOOTH link failed", one.packageId, cause)),
  );

const linkFromBlm = Effect.fn("linkFromBlm")(function* linkBlmPackages(
  tried: HashSet.HashSet<number>,
) {
  const blm = yield* Blm;
  const found = yield* blm.library;
  const pending = yield* pipe(
    found,
    Option.match({
      onNone: () => Effect.succeed<readonly Pending[]>([]),
      onSome: (library) => pendingIn(library, tried),
    }),
  );
  yield* pipe(pending, Effect.forEach(linkLogged));
  return pipe(
    pending,
    Array.map(({ packageId }) => packageId),
  );
});

/** @internal */
const blmLinker = Ref.make(HashSet.empty<number>()).pipe(
  Effect.map((tried) => ({
    link: Ref.get(tried).pipe(
      Effect.flatMap(linkFromBlm),
      Effect.flatMap((linked) => Ref.update(tried, HashSet.union(HashSet.fromIterable(linked)))),
    ),
    linkable: linkablePaths(),
  })),
);

export { blmLinker };

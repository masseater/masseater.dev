import { ARCHIVE_EXTENSIONS, LOOSE_EXTENSIONS } from "@masseater.dev/aredoko-protocol";
import { open } from "@tauri-apps/plugin-dialog";
import { Array, Effect, Option, Record, pipe } from "effect";

const FILTER = {
  name: "アセット",
  extensions: [...ARCHIVE_EXTENSIONS, ...pipe(Record.values(LOOSE_EXTENSIONS), Array.flatten)],
};

const FOLDER_TITLE = "アセットを置いているフォルダ";

const pickFiles = (): Promise<Option.Option<Array.NonEmptyReadonlyArray<string>>> =>
  Effect.runPromise(
    Effect.promise(() => open({ multiple: true, directory: false, filters: [FILTER] })).pipe(
      Effect.map((picked) => pipe(Option.fromNullOr(picked), Option.filter(Array.isArrayNonEmpty))),
    ),
  );

const pickFolder = (): Promise<Option.Option<string>> =>
  Effect.runPromise(
    Effect.promise(() => open({ directory: true, multiple: false, title: FOLDER_TITLE })).pipe(
      Effect.map(Option.fromNullOr),
    ),
  );

export { pickFiles, pickFolder };

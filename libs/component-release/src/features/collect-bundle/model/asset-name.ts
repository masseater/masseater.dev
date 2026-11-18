import {
  Effect,
  FileSystem,
  Function as Fn,
  Option,
  Path,
  Schema,
  String as Str,
  pipe,
} from "effect";

const DATA_FIRST_ARITY = 2;

const Manifest = Schema.fromJsonString(
  Schema.Struct({ name: Schema.String, version: Schema.String }),
);

/** @internal */
export interface Release {
  readonly name: string;
  readonly version: string;
}

const unscoped = (name: string): string => Str.replace(/^@[^/]+\//u, "")(name);

/** @internal */
export const releaseOf = Effect.fn("collect.release")(function* releaseOf(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(path.join(directory, "package.json"));
  const { name, version } = yield* Schema.decodeEffect(Manifest)(text).pipe(Effect.orDie);
  return { name: unscoped(name), version };
});

/** @internal */
export const assetName: {
  (file: string): (release: Release) => Option.Option<string>;
  (release: Release, file: string): Option.Option<string>;
} = Fn.dual(DATA_FIRST_ARITY, (release: Release, file: string): Option.Option<string> => {
  const marker = `_${release.version}_`;
  return pipe(
    Str.indexOf(marker)(file),
    Option.map((at) => `${release.name}${Str.slice(at)(file)}`),
  );
});

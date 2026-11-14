import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import { RepositoryFiles } from "./repository-files.ts";
import { prefixed, withoutRelative } from "./workspace-patterns.ts";

const MANIFEST_FILE = "package.json";
const WILDCARD = "*";
const EVERYTHING = "/**";

const ShadcnConfig = Schema.Struct({ aliases: Schema.Struct({ ui: Schema.String }) });
const ManifestImports = Schema.Struct({
  imports: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});
const decodeShadcnConfig = Schema.decodeUnknownOption(Schema.fromJsonString(ShadcnConfig));
const decodeManifestImports = Schema.decodeUnknownOption(Schema.fromJsonString(ManifestImports));

const withoutWildcard = Str.replace(WILDCARD, "");

const importTarget =
  (alias: string) =>
  ([key, target]: readonly [string, string]): Option.Option<string> => {
    if (!Str.endsWith(WILDCARD)(key)) {
      return Option.some(target).pipe(Option.filter(() => key === alias));
    }
    const prefix = withoutWildcard(key);
    if (!Str.startsWith(prefix)(alias)) {
      return Option.none();
    }
    return Option.some(`${withoutWildcard(target)}${Str.slice(prefix.length)(alias)}`);
  };

const resolvedAlias = (
  imports: Readonly<Record<string, string>>,
  alias: string,
): Option.Option<string> =>
  pipe(Rec.toEntries(imports), Arr.findFirst(importTarget(alias)), Option.map(withoutRelative));

const shadcnUiIn = Effect.fn("shadcnUiIn")(function* shadcnUiIn(root: string, name: string) {
  const files = yield* RepositoryFiles;
  const directory = files.dirname(name);
  const configText = yield* files.readFile(files.join(root, name));
  const manifestText = yield* files.readFile(files.join(root, directory, MANIFEST_FILE));
  const imports = pipe(
    manifestText,
    Option.flatMap(decodeManifestImports),
    Option.flatMap((manifest) => Option.fromUndefinedOr(manifest.imports)),
  );
  return pipe(
    configText,
    Option.flatMap(decodeShadcnConfig),
    Option.map(({ aliases }) =>
      pipe(
        imports,
        Option.flatMap((map) => resolvedAlias(map, aliases.ui)),
        Option.getOrElse(() => aliases.ui),
      ),
    ),
    Option.map((target) => `${prefixed(directory)(target)}${EVERYTHING}`),
  );
});

export { shadcnUiIn };

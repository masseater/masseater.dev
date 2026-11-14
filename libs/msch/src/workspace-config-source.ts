import { Array as Arr, Effect, Option, Record as Rec, Schema, pipe } from "effect";
import { parse } from "vite-plus";

import { literalOf, nestedValues } from "./config-literal.ts";

const SINGLE = 1;

const taggedError = Schema.TaggedError;

class WorkspaceSettingsInvalid extends taggedError<
  WorkspaceSettingsInvalid,
  { readonly brand: unique symbol }
>()("WorkspaceSettingsInvalid", { file: Schema.String, message: Schema.String }) {}

const settingsInvalid =
  (file: string) =>
  (reason: string): WorkspaceSettingsInvalid =>
    WorkspaceSettingsInvalid.make({ file, message: `${file}: ${reason}` });

interface WorkspaceSource {
  readonly file: string;
  readonly directory: string;
  readonly program: unknown;
}

type SettingsPath = readonly [string, string];

const notLiteral = ([outer, inner]: SettingsPath): string =>
  `${outer}.${inner} must be written with literal values, because the root vite.config.ts reads it without running this file. Name a set the root config defines in use instead of importing values.`;

const merged = <Value>(
  records: readonly Readonly<Record<string, Value>>[],
): Record<string, Value> => pipe(records, Arr.flatMap(Rec.toEntries), Rec.fromEntries);

const usedFrom = Effect.fn("usedFrom")(function* usedFrom<Value>(
  file: string,
  sets: Readonly<Record<string, Value>>,
  used: readonly string[],
) {
  const unknownSets = pipe(
    used,
    Arr.filter((name) => !Rec.has(sets, name)),
  );
  if (Arr.isReadonlyArrayNonEmpty(unknownSets)) {
    return yield* settingsInvalid(file)(
      `msch uses sets the root does not define: ${Arr.join(unknownSets, ", ")}. Defined: ${Arr.join(Rec.keys(sets), ", ")}.`,
    );
  }
  return pipe(
    used,
    Arr.flatMap((name) => Option.toArray(Rec.get(sets, name))),
  );
});

const singleValue = Effect.fn("singleValue")(function* singleValue(
  source: WorkspaceSource,
  path: SettingsPath,
) {
  const found = nestedValues(path)(source.program);
  if (found.length > SINGLE) {
    return yield* settingsInvalid(source.file)(`${Arr.join(path, ".")} appears more than once.`);
  }
  return Arr.head(found);
});

interface LiteralSettingsRequest<Settings> {
  readonly source: WorkspaceSource;
  readonly path: SettingsPath;
  readonly decode: (input: unknown) => Effect.Effect<Settings, Schema.SchemaError>;
}

const literalSettings = <Settings>({
  source,
  path,
  decode,
}: LiteralSettingsRequest<Settings>): Effect.Effect<
  Option.Option<Settings>,
  WorkspaceSettingsInvalid
> =>
  Effect.gen(function* literalSettingsIn() {
    const node = yield* singleValue(source, path);
    if (Option.isNone(node)) {
      return Option.none();
    }
    const literal = literalOf(node.value);
    if (Option.isNone(literal)) {
      return yield* settingsInvalid(source.file)(notLiteral(path));
    }
    const settings = yield* decode(literal.value).pipe(
      Effect.mapError((error) => settingsInvalid(source.file)(error.message)),
    );
    return Option.some(settings);
  });

const programOf = Effect.fn("programOf")(function* programOf(file: string, text: string) {
  const parsed = yield* Effect.promise(() => parse(file, text, { lang: "ts" }));
  if (Arr.isReadonlyArrayNonEmpty(parsed.errors)) {
    return yield* settingsInvalid(file)("vite.config.ts does not parse.");
  }
  const program: unknown = parsed.program;
  return program;
});

export { literalSettings, settingsInvalid, merged, programOf, usedFrom };
export type { LiteralSettingsRequest, SettingsPath, WorkspaceSettingsInvalid, WorkspaceSource };

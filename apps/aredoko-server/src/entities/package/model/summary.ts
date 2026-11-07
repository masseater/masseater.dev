import type { Effect } from "effect";
import { Array, HashMap, Option, Order, Record, Schema, String, pipe } from "effect";

import { capture } from "#shared/text";

import { avatarsIn, colorsIn } from "./aliases.ts";
import { kindOf } from "./kind.ts";
import type { AssetKind } from "./kind.ts";

const STANDARD_SHADER_GUID = "0000000000000000f000000000000000";

const SHADER_MARKERS = [
  { name: "lilToon", marker: "_lilToonVersion" },
  { name: "Poiyomi", marker: "shader_is_using_thry_editor" },
  { name: "UnityChanToonShader", marker: "_utsTechnique" },
] as const;

const StoredSummary = Schema.Struct({
  counts: Schema.Record(Schema.String, Schema.Int),
  shaders: Schema.Array(Schema.String),
  avatars: Schema.Array(Schema.String),
  colors: Schema.Array(Schema.String),
});

type PackageSummary = typeof StoredSummary.Type;

interface SummaryEntry {
  readonly guid: string;
  readonly pathname: string;
  readonly asset: Option.Option<Uint8Array>;
}

const encode = Schema.encodeEffect(Schema.fromJsonString(StoredSummary));

const decoder = new TextDecoder();

const decode = (bytes: Uint8Array): string => decoder.decode(bytes);

const textOf = ({ asset }: SummaryEntry): Option.Option<string> => pipe(asset, Option.map(decode));

const shaderGuidOf = capture({
  pattern: /m_Shader: \{fileID: -?\d+, guid: (?<guid>[0-9a-f]{32})/u,
  name: "guid",
});

const shaderNameOf = capture({ pattern: /Shader\s+"(?<name>[^"]+)"/u, name: "name" });

const markerOf = (material: string): Option.Option<string> =>
  pipe(
    SHADER_MARKERS,
    Array.findFirst(({ marker }) => pipe(material, String.includes(marker))),
    Option.map(({ name }) => name),
  );

const shaderOfMaterial =
  (shaders: HashMap.HashMap<string, string>) =>
  (material: string): Option.Option<string> =>
    pipe(
      shaderGuidOf(material),
      Option.flatMap((guid) =>
        pipe(
          HashMap.get(shaders, guid),
          Option.orElse(() =>
            Option.liftPredicate("Standard", () => guid === STANDARD_SHADER_GUID),
          ),
        ),
      ),
      Option.orElse(() => markerOf(material)),
    );

const shaderEntry = (entry: SummaryEntry): Option.Option<readonly [string, string]> =>
  pipe(
    textOf(entry),
    Option.flatMap(shaderNameOf),
    Option.map((name) => [entry.guid, name] as const),
  );

const ofKind =
  (kind: AssetKind) =>
  (entries: readonly SummaryEntry[]): readonly SummaryEntry[] =>
    pipe(
      entries,
      Array.filter(({ pathname }) => kindOf(pathname) === kind),
    );

const countKinds = (entries: readonly SummaryEntry[]): Readonly<Record<string, number>> =>
  pipe(
    entries,
    Array.groupBy(({ pathname }): string => kindOf(pathname)),
    Record.map(Array.length),
  );

const shadersOf = (entries: readonly SummaryEntry[]): readonly string[] => {
  const shaders = HashMap.fromIterable(
    pipe(entries, ofKind("shader"), Array.map(shaderEntry), Array.getSomes),
  );
  return pipe(
    entries,
    ofKind("material"),
    Array.map(textOf),
    Array.getSomes,
    Array.map(shaderOfMaterial(shaders)),
    Array.getSomes,
    Array.dedupe,
    Array.sortWith((name) => name, Order.String),
  );
};

const pathsOf = (entries: readonly SummaryEntry[]): string =>
  pipe(
    entries,
    Array.map(({ pathname }) => pathname),
    Array.join("\n"),
  );

const summarize = ({
  name,
  entries,
}: {
  readonly name: string;
  readonly entries: readonly SummaryEntry[];
}): PackageSummary => ({
  counts: countKinds(entries),
  shaders: shadersOf(entries),
  avatars: avatarsIn(`${name}\n${pathsOf(entries)}`),
  colors: colorsIn(pathsOf(ofKind("material")(entries))),
});

const listedEntry = ({
  guid,
  pathname,
}: Readonly<{ guid: string; pathname: string }>): SummaryEntry => ({
  guid,
  pathname,
  asset: Option.none(),
});

const encodeSummary = (input: {
  readonly name: string;
  readonly entries: readonly SummaryEntry[];
}): Effect.Effect<string, Schema.SchemaError> => encode(summarize(input));

export { StoredSummary, encodeSummary, listedEntry };
export type { SummaryEntry };

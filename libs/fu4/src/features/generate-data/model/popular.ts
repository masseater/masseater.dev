import {
  Array as Arr,
  Effect,
  Option,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import type { HttpClient } from "effect/http";
import { parse as parseYaml } from "yaml";

import { failedWith } from "#/shared/lib/errors.ts";
import type { Fu4Error } from "#/shared/lib/errors.ts";

import { fetchText } from "./fetch.ts";
import { isRetiredRuntime } from "./runtime.ts";
import { POPULAR_SEED, rawFile } from "./sources.ts";

const FETCH_CONCURRENCY = 8;
const EMPTY = Effect.succeed("");
const NOT_SKIPPED = Effect.succeed(false);
const YML = Effect.succeed("yml");
const NO_FIELDS = Effect.succeed({});

const Text = Schema.String.pipe(Schema.withDecodingDefaultKey(EMPTY));
const Skip = Schema.Boolean.pipe(Schema.withDecodingDefaultKey(NOT_SKIPPED));

const RegistryEntry = Schema.Struct({
  slug: Schema.String,
  path: Text,
  tags: Schema.Array(Schema.String),
  file_ext: Schema.String.pipe(Schema.withDecodingDefaultKey(YML)),
  skip_inputs: Skip,
  skip_outputs: Skip,
});

const decodeRegistry = Schema.decodeEffect(Schema.fromJsonString(Schema.Array(RegistryEntry)));

type Entry = typeof RegistryEntry.Type;

const Fields = Schema.Record(Schema.String, Schema.Unknown);

const Input = Schema.NullOr(Fields);

const Inputs = Schema.NullOr(Schema.Record(Schema.String, Input)).pipe(
  Schema.withDecodingDefaultKey(NO_FIELDS),
);

const Outputs = Schema.NullOr(Fields).pipe(Schema.withDecodingDefaultKey(NO_FIELDS));

const ActionYaml = Schema.Struct({
  name: Text,
  inputs: Inputs,
  outputs: Outputs,
  runs: Schema.Struct({ using: Text }),
});

const decodeAction = Schema.decodeUnknownEffect(ActionYaml);

export interface PopularInput {
  readonly name: string;
  readonly required: boolean;
  readonly deprecated: boolean;
  readonly deprecationMessage: string;
}

export interface PopularAction {
  readonly name: string;
  readonly inputs: Readonly<Record<string, PopularInput>>;
  readonly outputs: Readonly<Record<string, { readonly name: string }>>;
  readonly skipInputs: boolean;
  readonly skipOutputs: boolean;
  readonly using: string;
}

export interface PopularActions {
  readonly actions: Readonly<Record<string, PopularAction>>;
  readonly outdated: readonly string[];
}

interface Fetched {
  readonly spec: string;
  readonly action: PopularAction;
}

const inputOf = (name: string, input: typeof Input.Type): readonly [string, PopularInput] => {
  const fields = input ?? {};
  const message = pipe(
    Rec.get(fields, "deprecationMessage"),
    Option.filter(Predicate.isString),
    Option.map(Str.trim),
    Option.getOrElse(() => ""),
  );
  return [
    Str.toLowerCase(name),
    {
      name,
      required:
        Rec.get(fields, "required").pipe(Option.exists((required) => required === true)) &&
        !Rec.has(fields, "default"),
      deprecated: Rec.has(fields, "deprecationMessage"),
      deprecationMessage: message,
    },
  ];
};

const toAction =
  (entry: Entry) =>
  (metadata: typeof ActionYaml.Type): PopularAction => ({
    name: metadata.name,
    inputs: pipe(
      Rec.toEntries(metadata.inputs ?? {}),
      Arr.map(([name, input]) => inputOf(name, input)),
      Rec.fromEntries,
    ),
    outputs: pipe(
      Rec.keys(metadata.outputs ?? {}),
      Arr.map((name) => [Str.toLowerCase(name), { name }] as const),
      Rec.fromEntries,
    ),
    skipInputs: entry.skip_inputs,
    skipOutputs: entry.skip_outputs,
    using: metadata.runs.using,
  });

const fetchAction =
  (entry: Entry) =>
  (tag: string): Effect.Effect<Option.Option<Fetched>, never, HttpClient.HttpClient> => {
    const file = `${entry.path}/action.${entry.file_ext}`;
    return fetchText(rawFile(`${entry.slug}/${tag}${file}`)).pipe(
      Effect.flatMap((source) =>
        Effect.mapBoth(decodeAction(parseYaml(source, { uniqueKeys: false })), {
          onFailure: failedWith(`could not read the metadata of ${entry.slug}@${tag}`),
          onSuccess: toAction(entry),
        }),
      ),
      Effect.map((action) => ({ spec: `${entry.slug}${entry.path}@${tag}`, action })),
      Effect.option,
    );
  };

const isOutdated = ({ action }: Fetched): boolean =>
  Str.isEmpty(action.using) || isRetiredRuntime(action.using);

/** @internal */
export const popularActions: Effect.Effect<PopularActions, Fu4Error, HttpClient.HttpClient> =
  Effect.gen(function* popularActions() {
    const seed = yield* fetchText(POPULAR_SEED);
    const registry = yield* decodeRegistry(seed).pipe(
      Effect.mapError(failedWith("could not read the popular action list")),
    );
    const requests = pipe(
      registry,
      Arr.flatMap((entry) => pipe(entry.tags, Arr.map(fetchAction(entry)))),
    );
    const fetched = yield* Effect.all(requests, { concurrency: FETCH_CONCURRENCY });
    const sorted = pipe(
      fetched,
      Arr.getSomes,
      Arr.sortWith(({ spec }) => spec, Str.Order),
    );
    return {
      actions: pipe(
        sorted,
        Arr.filter((found) => !isOutdated(found)),
        Arr.map(({ spec, action }) => [spec, action] as const),
        Rec.fromEntries,
      ),
      outdated: pipe(
        sorted,
        Arr.filter(isOutdated),
        Arr.map(({ spec }) => spec),
      ),
    };
  });

import { Array as Arr, Effect, Option, Predicate, Schema, String as Str, pipe } from "effect";
import type { HttpClient } from "effect/http";
import { Liquid } from "liquidjs";
import { parse as parseYaml } from "yaml";

import { dataTag } from "./data-tag.ts";
import { failedWith } from "./errors.ts";
import type { GenerateDataError } from "./errors.ts";
import { fetchText } from "./fetch.ts";
import { IF_VERSION } from "./if-version.ts";
import { Octicon } from "./octicon.ts";
import { DOCS_ROOT } from "./sources.ts";

const EMPTY_ROW = /^\|\s*\|\s*$/u;
const REUSABLES = "reusables";

type Run = <Value>(
  effect: Effect.Effect<Value, GenerateDataError, HttpClient.HttpClient>,
) => Promise<Value>;

type Render = (source: string) => Effect.Effect<string, GenerateDataError>;

const decodeString = Schema.decodeUnknownEffect(Schema.String);

const valueAt = (data: unknown, keys: readonly string[]): string => {
  if (!Arr.isReadonlyArrayNonEmpty(keys)) {
    return pipe(
      Option.liftPredicate(data, Predicate.isString),
      Option.getOrElse(() => ""),
    );
  }
  const [key, ...rest] = keys;
  return pipe(
    Option.liftPredicate(data, Predicate.hasProperty(key)),
    Option.map((found) => valueAt(found[key], rest)),
    Option.getOrElse(() => ""),
  );
};

const makeEngine = (run: Run): Render => {
  const engine = new Liquid();
  const cache = new Map<string, Promise<string>>();
  const fetchCached = (url: string): Effect.Effect<string, GenerateDataError> =>
    Effect.tryPromise({
      try: () => {
        const pending = cache.getOrInsertComputed(url, () => run(fetchText(url)));
        return pending;
      },
      catch: failedWith(`could not fetch ${url}`),
    });
  const render: Render = (source) =>
    Effect.tryPromise({
      try: (): Promise<unknown> => engine.parseAndRender(source),
      catch: failedWith("could not render docs"),
    }).pipe(Effect.flatMap(decodeString), Effect.mapError(failedWith("could not render docs")));
  const resolve = (path: string): Effect.Effect<string, GenerateDataError> => {
    const keys = Str.split(path, ".");
    const [group, file, ...rest] = keys;
    if (group === REUSABLES) {
      return fetchCached(`${DOCS_ROOT}/data/${Arr.join(keys, "/")}.md`).pipe(
        Effect.flatMap((source) => render(Str.trim(source))),
      );
    }
    return fetchCached(`${DOCS_ROOT}/data/${group}/${file ?? ""}.yml`).pipe(
      Effect.flatMap((source) => render(valueAt(parseYaml(source), rest))),
    );
  };
  engine.registerTag("ifversion", IF_VERSION);
  engine.registerTag("octicon", Octicon);
  engine.registerTag(
    "data",
    dataTag((path) => run(resolve(path))),
  );
  return render;
};

/** @internal */
export const renderDocs = (
  url: string,
): Effect.Effect<string, GenerateDataError, HttpClient.HttpClient> =>
  Effect.gen(function* rendered() {
    const context = yield* Effect.context<HttpClient.HttpClient>();
    const render = makeEngine((effect) => Effect.runPromiseWith(context)(effect));
    const source = yield* fetchText(url);
    const output = yield* render(source);
    return pipe(
      Str.split(output, "\n"),
      Arr.filter((line) => !EMPTY_ROW.test(line)),
      Arr.join("\n"),
    );
  });

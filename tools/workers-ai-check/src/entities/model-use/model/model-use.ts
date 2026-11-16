import { Array as Arr, Function as Fn, Option, Order, String as Str, pipe } from "effect";

const MODEL_PATTERN = /@cf\/[\w.-]+\/[\w.-]+/gu;

export type CatalogEntry = Readonly<{ name: string; retiresOn: Option.Option<string> }>;

export type Finding = Readonly<{ model: string; problem: "retiring" | "missing"; on: string }>;

export const modelsIn = (text: string): readonly string[] =>
  pipe(
    text,
    Str.matchAll(MODEL_PATTERN),
    Arr.fromIterable,
    Arr.map(([found]) => found),
    Arr.dedupe,
    Arr.sortWith(Fn.identity, Order.String),
  );

export const searchTermOf = (model: string): string =>
  pipe(
    Str.split(model, "/"),
    Arr.last,
    Option.getOrElse(() => model),
  );

const findingOf =
  (catalog: readonly CatalogEntry[]) =>
  (model: string): Option.Option<Finding> =>
    pipe(
      catalog,
      Arr.findFirst((entry) => entry.name === model),
      Option.match({
        onNone: () => Option.some<Finding>({ model, problem: "missing", on: "" }),
        onSome: (entry) =>
          pipe(
            entry.retiresOn,
            Option.map((on): Finding => ({ model, problem: "retiring", on })),
          ),
      }),
    );

export const findingsOf = ({
  models,
  catalog,
}: Readonly<{ models: readonly string[]; catalog: readonly CatalogEntry[] }>): readonly Finding[] =>
  pipe(models, Arr.map(findingOf(catalog)), Arr.getSomes);

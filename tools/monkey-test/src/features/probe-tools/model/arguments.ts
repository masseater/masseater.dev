import {
  Array as Arr,
  Effect,
  Random,
  Option,
  Order,
  Predicate,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

import fixtures from "./traps.json" with { type: "json" };

export type Attempt = Readonly<{ label: string; arguments: Readonly<Record<string, unknown>> }>;

type Trap = Readonly<{ name: string; value: unknown }>;
type Fields = Readonly<Record<string, unknown>>;

const RANDOM_ATTEMPTS = 23;
const UNKNOWN_VALUE = 1;
const LONG_TEXT = 10_000;
const TRAPS: Readonly<Record<string, readonly Trap[]>> = fixtures.traps;
const VALID: Fields = fixtures.valid;
const WRONG: readonly Trap[] = fixtures.wrong;
const LONG: Trap = { name: "long", value: Str.repeat(LONG_TEXT)("a") };

const isList = (value: unknown): value is readonly unknown[] => Arr.isArray(value);

const field = (value: unknown, key: string): Option.Option<unknown> =>
  pipe(
    Option.liftPredicate(value, Predicate.isObject),
    Option.flatMap((record) => Rec.get(record as Fields, key)),
  );

const firstNamed = (declared: unknown): Option.Option<string> =>
  pipe(
    Option.liftPredicate(declared, isList),
    Option.flatMap((names) => Arr.findFirst(names, (name) => name !== "null")),
    Option.filter(Predicate.isString),
  );

const typeOf = (schema: unknown): Option.Option<string> =>
  pipe(
    field(schema, "type"),
    Option.flatMap((declared) =>
      Option.orElse(Option.liftPredicate(declared, Predicate.isString), () => firstNamed(declared)),
    ),
  );

const propertiesOf = (schema: unknown): Fields =>
  pipe(
    field(schema, "properties"),
    Option.filter(Predicate.isObject),
    Option.map((found) => found as Fields),
    Option.getOrElse((): Fields => ({})),
  );

const requiredOf = (schema: unknown): readonly string[] =>
  pipe(
    field(schema, "required"),
    Option.filter(isList),
    Option.map((names) =>
      pipe(
        names,
        Arr.filter((name): name is string => Predicate.isString(name)),
      ),
    ),
    Option.getOrElse((): readonly string[] => []),
  );

const memberOf = (schema: unknown): Option.Option<unknown> =>
  pipe(
    field(schema, "enum"),
    Option.filter(isList),
    Option.flatMap(Arr.head),
    Option.orElse(() => field(schema, "const")),
  );

const validValue = (schema: unknown): Option.Option<unknown> =>
  pipe(
    memberOf(schema),
    Option.orElse(() => Option.flatMap(typeOf(schema), (type) => Rec.get(VALID, type))),
  );

const requiredArguments = (schema: unknown): Fields => {
  const properties = propertiesOf(schema);
  return pipe(
    requiredOf(schema),
    Arr.flatMap((name) =>
      pipe(
        Rec.get(properties, name),
        Option.flatMap(validValue),
        Option.map((value): [string, unknown] => [name, value]),
        Option.toArray,
      ),
    ),
    Rec.fromEntries,
  );
};

const isText = (schema: unknown): boolean => Option.contains(typeOf(schema), "string");

const notAMember: Trap = { name: "not-a-member", value: "monkey-x" };

const trapsFor = (schema: unknown): readonly Trap[] =>
  pipe(
    typeOf(schema),
    Option.flatMap((type) => Rec.get(TRAPS, type)),
    Option.map((found) => [...found, ...Option.toArray(Option.as(memberOf(schema), notAMember))]),
    Option.map((found) =>
      Arr.appendAll(found, Option.toArray(Option.liftPredicate(LONG, () => isText(schema)))),
    ),
    Option.getOrElse(() => WRONG),
  );

const trapsOfProperty = (
  input: Readonly<{ base: Fields; name: string; schema: unknown }>,
): readonly Attempt[] =>
  pipe(
    trapsFor(input.schema),
    Arr.map(({ name, value }) => ({
      label: `${input.name}=${name}`,
      arguments: { ...input.base, [input.name]: value },
    })),
  );

const allAttempts = (schema: unknown): readonly Attempt[] => {
  const base = requiredArguments(schema);
  return [
    ...pipe(
      Rec.toEntries(propertiesOf(schema)),
      Arr.sortWith(([name]) => name, Order.String),
      Arr.flatMap(([name, property]) => trapsOfProperty({ base, name, schema: property })),
    ),
    ...pipe(
      requiredOf(schema),
      Arr.map((name) => ({ label: `without ${name}`, arguments: Rec.remove(base, name) })),
    ),
    { label: "unknown property", arguments: { ...base, monkey_unknown: UNKNOWN_VALUE } },
  ];
};

export const attemptsOf = Effect.fn("monkey.mcp.attempts")(function* attemptsOf(
  input: Readonly<{ schema: unknown; seed: number }>,
) {
  const shuffled = yield* Random.shuffle(allAttempts(input.schema)).pipe(
    Random.withSeed(input.seed),
  );
  return [
    { label: "valid", arguments: requiredArguments(input.schema) },
    ...Arr.take(shuffled, RANDOM_ATTEMPTS),
  ];
});

import { Array, Match, Option, Predicate, Schema, pipe } from "effect";
import type { SchemaRepresentation } from "effect";

const IS_INT = "effect/schema/isInt";
const ZERO = 0;
const STEP = 1;
const U32_MAX = 4_294_967_295;
const I32_MIN = -2_147_483_648;
const I32_MAX = 2_147_483_647;

const BoundsPayload = Schema.Struct({
  minimum: Schema.optionalKey(Schema.Finite),
  maximum: Schema.optionalKey(Schema.Finite),
  exclusiveMinimum: Schema.optionalKey(Schema.Union([Schema.Finite, Schema.Boolean])),
  exclusiveMaximum: Schema.optionalKey(Schema.Union([Schema.Finite, Schema.Boolean])),
});

type Payload = typeof BoundsPayload.Type;

const decodePayload = Schema.decodeUnknownOption(BoundsPayload);

type Bounds = Readonly<{ int: boolean; min: number; max: number }>;

const filters = (
  checks: readonly SchemaRepresentation.Check[],
): readonly SchemaRepresentation.Filter[] =>
  pipe(
    checks,
    Array.flatMap((check) =>
      Match.value(check).pipe(
        Match.tagsExhaustive({
          Filter: (filter) => [filter],
          FilterGroup: (group) => filters(group.checks),
        }),
      ),
    ),
  );

const shiftWhen =
  (step: number) =>
  (flag: number | boolean | undefined): number =>
    Match.value(flag).pipe(
      Match.when(true, () => step),
      Match.orElse(() => ZERO),
    );

const numbers = (values: readonly (number | boolean | undefined)[]): readonly number[] =>
  pipe(values, Array.filter(Predicate.isNumber));

const lows =
  (step: number) =>
  (payload: Payload): readonly number[] => [
    ...pipe(
      numbers([payload.minimum]),
      Array.map((minimum) => minimum + shiftWhen(step)(payload.exclusiveMinimum)),
    ),
    ...pipe(
      numbers([payload.exclusiveMinimum]),
      Array.map((minimum) => minimum + step),
    ),
  ];

const highs =
  (step: number) =>
  (payload: Payload): readonly number[] => [
    ...pipe(
      numbers([payload.maximum]),
      Array.map((maximum) => maximum - shiftWhen(step)(payload.exclusiveMaximum)),
    ),
    ...pipe(
      numbers([payload.exclusiveMaximum]),
      Array.map((maximum) => maximum - step),
    ),
  ];

const payloadOf = (filter: SchemaRepresentation.Filter): Option.Option<Payload> =>
  pipe(
    Option.fromNullishOr(filter.representation),
    Option.flatMap(({ payload }) => decodePayload(payload)),
  );

const isIntFilter = (filter: SchemaRepresentation.Filter): boolean =>
  pipe(
    Option.fromNullishOr(filter.representation),
    Option.exists(({ id }) => id === IS_INT),
  );

const choose = (bounds: Bounds): string =>
  Match.value(bounds).pipe(
    Match.when(
      ({ int }) => !int,
      () => "f64",
    ),
    Match.when(
      ({ min, max }) => min >= ZERO && max <= U32_MAX,
      () => "u32",
    ),
    Match.when(
      ({ min }) => min >= ZERO,
      () => "u64",
    ),
    Match.when(
      ({ min, max }) => min >= I32_MIN && max <= I32_MAX,
      () => "i32",
    ),
    Match.orElse(() => "i64"),
  );

export const numberType = (checks: readonly SchemaRepresentation.Check[]): string => {
  const flat = filters(checks);
  const int = pipe(flat, Array.some(isIntFilter));
  const step = Match.value(int).pipe(
    Match.when(true, () => STEP),
    Match.orElse(() => ZERO),
  );
  const payloads = pipe(flat, Array.map(payloadOf), Array.getSomes);
  const minimums = pipe(payloads, Array.flatMap(lows(step)));
  const maximums = pipe(payloads, Array.flatMap(highs(step)));
  return choose({
    int,
    min: Math.max(Number.NEGATIVE_INFINITY, ...minimums),
    max: Math.min(Number.POSITIVE_INFINITY, ...maximums),
  });
};

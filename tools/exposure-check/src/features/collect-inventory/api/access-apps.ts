import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";

import type { AccessApp, AccessPolicy } from "#/entities/exposure/index.ts";

const PUBLIC_OVERRIDE = "public";

const fieldOf = (value: unknown, field: string): Option.Option<unknown> =>
  pipe(
    Option.liftPredicate(value, Predicate.isObject),
    Option.flatMap((holder) => Rec.get(holder, field)),
  );

const stringField = (value: unknown, field: string): Option.Option<string> =>
  pipe(fieldOf(value, field), Option.filter(Predicate.isString));

const textField = (value: unknown, field: string): string =>
  Option.getOrElse(stringField(value, field), () => "");

const isList = (value: unknown): value is readonly unknown[] => Arr.isArray(value);

const listField = (value: unknown, field: string): readonly unknown[] =>
  pipe(
    fieldOf(value, field),
    Option.filter(isList),
    Option.getOrElse((): readonly unknown[] => []),
  );

const ruleKinds = (rule: unknown): readonly string[] =>
  pipe(
    Option.liftPredicate(rule, Predicate.isObject),
    Option.map((holder) => Rec.keys(holder)),
    Option.getOrElse((): readonly string[] => []),
  );

const policyOf = (policy: unknown): AccessPolicy => ({
  name: textField(policy, "name"),
  decision: textField(policy, "decision"),
  include: pipe(listField(policy, "include"), Arr.flatMap(ruleKinds)),
});

const publicPaths = (destination: unknown): readonly string[] =>
  pipe(
    listField(destination, "overrides"),
    Arr.filter((override) => textField(override, "behavior") === PUBLIC_OVERRIDE),
    Arr.flatMap((override) => Option.toArray(stringField(override, "pathPattern"))),
  );

const destinationsOf = (app: unknown): readonly string[] =>
  pipe(
    [
      ...pipe(
        listField(app, "destinations"),
        Arr.flatMap((destination) => Option.toArray(stringField(destination, "uri"))),
      ),
      ...Option.toArray(stringField(app, "domain")),
    ],
    Arr.filter((uri) => uri !== ""),
    Arr.dedupe,
  );

export const appOf = (app: unknown): AccessApp => ({
  name: textField(app, "name"),
  type: textField(app, "type"),
  destinations: destinationsOf(app),
  publicPaths: pipe(listField(app, "destinations"), Arr.flatMap(publicPaths), Arr.dedupe),
  policies: pipe(listField(app, "policies"), Arr.map(policyOf)),
  oauth: pipe(
    fieldOf(app, "oauthConfiguration"),
    Option.flatMap((configuration) => fieldOf(configuration, "enabled")),
    Option.exists((enabled) => enabled === true),
  ),
});

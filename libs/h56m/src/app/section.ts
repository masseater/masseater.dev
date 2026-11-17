import { Option, Predicate, pipe } from "effect";

import type { H56mConfig } from "#/shared/config/index.ts";

const hasSection = (value: unknown): value is { readonly h56m: H56mConfig } =>
  Predicate.hasProperty(value, "h56m") && Predicate.isObject(value.h56m);

export const h56mSection = (config: unknown): H56mConfig =>
  pipe(
    Option.liftPredicate(config, hasSection),
    Option.map((value) => value.h56m),
    Option.getOrElse((): H56mConfig => ({})),
  );

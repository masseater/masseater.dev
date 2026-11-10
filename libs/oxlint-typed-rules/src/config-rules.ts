import { Option, Predicate } from "effect";

const rulesOf = (config: unknown): Option.Option<Readonly<Record<string, unknown>>> =>
  Option.liftPredicate(config, Predicate.hasProperty("rules")).pipe(
    Option.flatMap(({ rules }) => Option.liftPredicate(rules, Predicate.isReadonlyObject)),
  );

export { rulesOf };

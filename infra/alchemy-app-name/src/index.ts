import { Zone } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str } from "effect";

const decodeNamed = Schema.decodeUnknownOption(Schema.Struct({ name: Schema.String }));

type AppNamed = Readonly<{
  prefix: string;
  requireAppPrefix: Effect.Effect<readonly string[], never, Stack>;
}>;

const appNamed = (appName: string): AppNamed => {
  const prefix = `${appName}-`;
  const describeUnprefixed = ({
    FQN,
    Type,
    Props,
  }: Readonly<{ FQN: string; Type: string; Props: unknown }>): readonly string[] =>
    decodeNamed(Props).pipe(
      Option.filter(() => Type !== Zone.Zone.Type),
      Option.filter(({ name }) => !Str.startsWith(prefix)(name)),
      Option.map(({ name }) => `${FQN}: ${name}`),
      Option.toArray,
    );
  const requireAppPrefix = Effect.gen(function* requireAppPrefix() {
    const { name, resources } = yield* Stack;
    const offenders = [
      ...Arr.filter([`Stack: ${name}`], () => name !== appName),
      ...Arr.flatMap(Rec.values(resources), (resource) => describeUnprefixed(resource)),
    ];
    if (Arr.isReadonlyArrayNonEmpty(offenders)) {
      return yield* Effect.die(
        new Error(
          `Alchemy のスタック名は "${appName}"、リソース名は "${prefix}" で始める: ${Arr.join(offenders, ", ")}`,
        ),
      );
    }
    return offenders;
  });
  return { prefix, requireAppPrefix };
};

export { appNamed };
export type { AppNamed };

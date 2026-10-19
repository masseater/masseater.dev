import { Stack } from "alchemy";
import { Zone } from "alchemy/Cloudflare";
import { Array as Arr, Effect, Option, Record as Rec, Schema } from "effect";

const APP_NAME = "masseater-dev";

const PREFIX = `${APP_NAME}-`;

const CI_TELEMETRY_AUDIENCE = `${PREFIX}ci-telemetry`;

const decodeNamed = Schema.decodeUnknownOption(Schema.Struct({ name: Schema.String }));

const describeUnprefixed = ({
  FQN,
  Type,
  Props,
}: Readonly<{ FQN: string; Type: string; Props: unknown }>): readonly string[] =>
  decodeNamed(Props).pipe(
    Option.filter(() => Type !== Zone.Zone.Type),
    Option.filter(({ name }) => !name.startsWith(PREFIX)),
    Option.map(({ name }) => `${FQN}: ${name}`),
    Option.toArray,
  );

const requireAppPrefix = Effect.gen(function* requireAppPrefix() {
  const { name, resources } = yield* Stack;
  const offenders = [
    ...Arr.filter([`Stack: ${name}`], () => name !== APP_NAME),
    ...Arr.flatMap(Rec.values(resources), (resource) => describeUnprefixed(resource)),
  ];
  if (Arr.isReadonlyArrayNonEmpty(offenders)) {
    return yield* Effect.die(
      new Error(
        `Alchemy のスタック名は "${APP_NAME}"、リソース名は "${PREFIX}" で始める: ${Arr.join(offenders, ", ")}`,
      ),
    );
  }
  return offenders;
});

export { APP_NAME, CI_TELEMETRY_AUDIENCE, requireAppPrefix };

import { State } from "alchemy/State";
import type { StateService } from "alchemy/State";
import { Effect, Option, Schema } from "effect";

import { PREFIX } from "./broker-names.ts";

export const TAILNET_STACK = `${PREFIX}tailnet`;

const STAGE = "prod";

const FederationSchema = Schema.Struct({
  TAILNET_CLIENT_ID: Schema.String,
  TAILNET_AUDIENCE: Schema.String,
});

export type Federation = typeof FederationSchema.Type;

const decodeFederation = Schema.decodeUnknownOption(FederationSchema);

const notDeployed = (): Effect.Effect<Partial<Federation>> =>
  Effect.logWarning(`${TAILNET_STACK} has no output at ${STAGE}; join_tailnet stays disabled`).pipe(
    Effect.as({}),
  );

const deployedFederation = (state: Readonly<StateService>): Effect.Effect<Partial<Federation>> =>
  state
    .getOutput({ stack: TAILNET_STACK, stage: STAGE })
    .pipe(
      Effect.orDie,
      Effect.map(decodeFederation),
      Effect.flatMap(Option.match({ onNone: notDeployed, onSome: Effect.succeed })),
    );

export const tailnetFederation: Effect.Effect<Partial<Federation>> = Effect.serviceOption(
  State,
).pipe(
  Effect.flatMap(
    Option.match({
      onNone: notDeployed,
      onSome: (state: Effect.Effect<StateService>) =>
        state.pipe(Effect.flatMap(deployedFederation)),
    }),
  ),
);

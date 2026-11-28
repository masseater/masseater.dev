import { Schema } from "effect";

const PRODUCTION = "production";
const STAGES = "stages";

/** @internal */
export const Stacks = Schema.Struct({ name: Schema.String, filter: Schema.String }).pipe(
  Schema.Array,
  Schema.fromJsonString,
);

/** @internal */
export type DeploymentRecord = Readonly<{ environment: string; task: string }>;

/** @internal */
export const deployed = (stack: string): DeploymentRecord => ({
  environment: PRODUCTION,
  task: `deploy:${stack}`,
});

/** @internal */
export const staged =
  (task: string) =>
  (stack: string): DeploymentRecord => ({ environment: STAGES, task: `${task}:${stack}` });

/** @internal */
export const isProduction = (environment: string): boolean => environment === PRODUCTION;

import type { Option } from "effect";

import type { AllowDeny } from "./config.ts";

export interface Cooldown {
  readonly defaultDays: Option.Option<number>;
}

export interface UpdateModel {
  readonly packageEcosystem: string;
  readonly insecureExternalCodeExecution: AllowDeny;
  readonly cooldown: Option.Option<Cooldown>;
  readonly multiEcosystemGroup: Option.Option<string>;
}

export interface DependabotModel {
  readonly updates: readonly UpdateModel[];
}

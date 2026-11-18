import type { Option } from "effect";

export interface Cooldown {
  readonly defaultDays: Option.Option<number>;
}

export interface UpdateModel {
  readonly packageEcosystem: string;
  readonly insecureExternalCodeExecution: "allow" | "deny";
  readonly cooldown: Option.Option<Cooldown>;
  readonly multiEcosystemGroup: Option.Option<string>;
}

export interface DependabotModel {
  readonly updates: readonly UpdateModel[];
}

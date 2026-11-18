import type { Option } from "effect";

import type { DockerUses, EnvValue, If, LoE, Uses } from "./common.ts";

export type ActionStepBody =
  | {
      readonly type: "uses";
      readonly uses: Uses;
      readonly with: LoE<ReadonlyMap<string, EnvValue>>;
    }
  | {
      readonly type: "run";
      readonly run: string;
      readonly shell: LoE<string>;
      readonly workingDirectory: Option.Option<string>;
    };

export interface ActionStepModel {
  readonly id: Option.Option<string>;
  readonly if: Option.Option<If>;
  readonly name: Option.Option<string>;
  readonly env: LoE<ReadonlyMap<string, EnvValue>>;
  readonly body: ActionStepBody;
}

export type DockerImage =
  | { readonly type: "dockerfile" }
  | { readonly type: "image"; readonly image: LoE<DockerUses> };

export type Runs =
  | { readonly type: "javascript"; readonly using: string }
  | {
      readonly type: "composite";
      readonly using: string;
      readonly steps: readonly ActionStepModel[];
    }
  | {
      readonly type: "docker";
      readonly using: string;
      readonly image: DockerImage;
      readonly env: ReadonlyMap<string, EnvValue>;
    };

export interface ActionModel {
  readonly name: Option.Option<string>;
  readonly inputs: readonly string[];
  readonly runs: Runs;
}

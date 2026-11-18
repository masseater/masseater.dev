import { Option } from "effect";

export interface ActionInput {
  readonly name: string;
  readonly required: boolean;
  readonly deprecated: boolean;
  readonly deprecationMessage: string;
}

export interface ActionRuns {
  readonly using: string;
  readonly main: string;
  readonly pre: string;
  readonly preIf: string;
  readonly post: string;
  readonly postIf: string;
  readonly steps: Option.Option<number>;
  readonly image: string;
  readonly preEntrypoint: string;
  readonly entrypoint: string;
  readonly postEntrypoint: string;
  readonly args: boolean;
  readonly env: boolean;
}

export interface Branding {
  readonly icon: string;
  readonly color: string;
}

export interface ActionMetadata {
  readonly name: string;
  readonly description: string;
  readonly inputs: Readonly<Record<string, ActionInput>>;
  readonly outputs: Readonly<Record<string, string>>;
  readonly skipInputs: boolean;
  readonly skipOutputs: boolean;
  readonly runs: ActionRuns;
  readonly branding: Branding;
}

export const EMPTY_RUNS: ActionRuns = {
  using: "",
  main: "",
  pre: "",
  preIf: "",
  post: "",
  postIf: "",
  steps: Option.none(),
  image: "",
  preEntrypoint: "",
  entrypoint: "",
  postEntrypoint: "",
  args: false,
  env: false,
};

export const EMPTY_ACTION: ActionMetadata = {
  name: "",
  description: "",
  inputs: {},
  outputs: {},
  skipInputs: false,
  skipOutputs: false,
  runs: EMPTY_RUNS,
  branding: { icon: "", color: "" },
};

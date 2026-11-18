import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { EMPTY_ACTION, EMPTY_RUNS } from "#/entities/action/model/types.ts";
import type { ActionInput, ActionMetadata } from "#/entities/action/model/types.ts";
import data from "#/shared/data/popular-actions.json" with { type: "json" };

interface PopularAction {
  readonly name: string;
  readonly inputs: Readonly<Record<string, ActionInput>>;
  readonly outputs: Readonly<Record<string, unknown>>;
  readonly skipInputs: boolean;
  readonly skipOutputs: boolean;
  readonly using: string;
}

const ACTIONS: Readonly<Record<string, PopularAction>> = data.actions;
export const OUTDATED = new Set<string>(data.outdated);

const metadataOf = (action: PopularAction): ActionMetadata => ({
  ...EMPTY_ACTION,
  name: action.name,
  inputs: Rec.fromEntries(
    pipe(
      Rec.values(action.inputs),
      Arr.map((input) => [Str.toLowerCase(input.name), input] as const),
    ),
  ),
  outputs: Rec.fromEntries(
    pipe(
      Rec.keys(action.outputs),
      Arr.map((name) => [Str.toLowerCase(name), name] as const),
    ),
  ),
  skipInputs: action.skipInputs,
  skipOutputs: action.skipOutputs,
  runs: { ...EMPTY_RUNS, using: action.using },
});

export const popular = (spec: string): Option.Option<ActionMetadata> =>
  Option.map(Rec.get(ACTIONS, spec), metadataOf);

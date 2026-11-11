import { Array as Arr, pipe } from "effect";
import { dual } from "effect/Function";

import { parseDraft } from "#/pages/interview/lib/draft";
import type { StrategyId } from "#strategies";

import type { Asking, Candidate, Draft } from "./atoms.ts";

const IDLE: Asking = { status: "idle" };
const PATCH_ARITY = 3;

const draftingFor = (strategies: readonly StrategyId[]): Asking => ({
  status: "drafting",
  drafts: pipe(
    strategies,
    Arr.map((strategy): Draft => ({ strategy, text: "", status: "streaming" })),
  ),
});

const patched = (asking: Asking, strategy: StrategyId, patch: Partial<Draft>): Asking => {
  if (asking.status === "idle") {
    return asking;
  }
  return {
    ...asking,
    drafts: pipe(
      asking.drafts,
      Arr.map((draft) => {
        if (draft.strategy === strategy) {
          return { ...draft, ...patch };
        }
        return draft;
      }),
    ),
  };
};

const withDraft: {
  (strategy: StrategyId, patch: Partial<Draft>): (asking: Asking) => Asking;
  (asking: Asking, strategy: StrategyId, patch: Partial<Draft>): Asking;
} = dual(PATCH_ARITY, patched);

const settled = (asking: Asking): Asking => {
  if (asking.status === "drafting") {
    return { status: "choosing", drafts: asking.drafts };
  }
  return asking;
};

const candidateOf = (draft: Draft): Candidate => {
  const { reason, question } = parseDraft(draft.text);
  return { strategy: draft.strategy, reason, question };
};

const candidatesOf = (drafts: readonly Draft[]): readonly Candidate[] =>
  pipe(drafts, Arr.map(candidateOf));

/** @internal */
export { IDLE, candidatesOf, draftingFor, settled, withDraft };

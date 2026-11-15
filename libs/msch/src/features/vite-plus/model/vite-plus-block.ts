import { Array as Arr, Option, String as Str } from "effect";

import { agentDocProblems } from "#/shared/lib/agent-docs.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "vite-plus-block";
const MARKER = Arr.join(["<!--", "VITE PLUS START", "-->"], "");
const MESSAGE =
  "holds the Vite+ block that `vp create --agent` and `vp migrate --agent` write, and every `vp config` rewrites it. Delete the block with its markers. The vite-plus skill reads the same guidance from node_modules/vite-plus/AGENTS.md.";

const problemIn =
  (file: string) =>
  (source: string): Option.Option<Problem> => {
    const index = Str.indexOf(MARKER)(source);
    if (Option.isNone(index)) {
      return Option.none();
    }
    return Option.some({ file, ...positionOf(source)(index.value), rule: RULE, message: MESSAGE });
  };

/** @internal */
export const checkVitePlusBlock = (root: string): ReturnType<typeof agentDocProblems> =>
  agentDocProblems(root, problemIn);

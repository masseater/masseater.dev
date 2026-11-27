import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Heading, Nodes } from "mdast";

import type { ScriptError } from "./script-error.ts";
import { errorAt } from "./script-error.ts";

const SECTION_DEPTH = 2;
const BEFORE_HEADING = "最初の `#` の見出しより前に本文がある";

export interface Section {
  readonly depth: number;
  readonly title: readonly Nodes[];
  readonly anchor: Nodes;
  readonly blocks: readonly Nodes[];
}

const isSectionHeading = (block: Nodes): block is Heading =>
  block.type === "heading" && block.depth <= SECTION_DEPTH;

export const sectionsOf = (
  blocks: readonly Nodes[],
): Effect.Effect<readonly Section[], ScriptError> => {
  const sections: { depth: number; title: readonly Nodes[]; anchor: Nodes; blocks: Nodes[] }[] = [];
  const content = pipe(
    blocks,
    Arr.filter((block) => block.type !== "yaml"),
  );
  for (const block of content) {
    const current = Arr.last(sections);
    if (isSectionHeading(block)) {
      sections.push({ depth: block.depth, title: block.children, anchor: block, blocks: [] });
    } else if (Option.isSome(current)) {
      current.value.blocks.push(block);
    } else {
      return Effect.fail(errorAt({ node: block, message: BEFORE_HEADING }));
    }
  }
  return Effect.succeed(sections);
};

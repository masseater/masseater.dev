import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

const MAPPINGS = new Set(["block_mapping", "flow_mapping"]);
const SEQUENCES = new Set(["block_sequence", "flow_sequence"]);
const PAIRS = new Set(["block_mapping_pair", "flow_pair"]);
const CONTAINERS = new Set(["block_node", "flow_node"]);
const QUOTED = new Set(["single_quote_scalar", "double_quote_scalar"]);

export const isMapping = (node: SyntaxNode): boolean => MAPPINGS.has(node.type);
export const isSequence = (node: SyntaxNode): boolean => SEQUENCES.has(node.type);
export const isPair = (node: SyntaxNode): boolean => PAIRS.has(node.type);
export const isContainer = (node: SyntaxNode): boolean => CONTAINERS.has(node.type);
export const isQuoted = (node: SyntaxNode): boolean => QUOTED.has(node.type);
export const isAnchor = (node: SyntaxNode): boolean => node.type === "anchor";
export const isAlias = (node: SyntaxNode): boolean => node.type === "alias";
export const isComment = (node: SyntaxNode): boolean => node.type === "comment";

export const childAt =
  (index: number) =>
  (node: SyntaxNode): Option.Option<SyntaxNode> =>
    Arr.get(node.children, index);

export const namedWhere =
  (predicate: (node: SyntaxNode) => boolean) =>
  (node: SyntaxNode): Option.Option<SyntaxNode> =>
    pipe(node.namedChildren, Arr.findFirst(predicate));

export const parentOf = (node: SyntaxNode): Option.Option<SyntaxNode> =>
  Option.fromNullishOr(node.parent);

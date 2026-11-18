import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Predicate, Result, String as Str, pipe } from "effect";

import { fieldOf } from "#/shared/syntax/index.ts";

import { resolveAnchor } from "./document.ts";
import type { Document } from "./document.ts";
import {
  childAt,
  isAlias,
  isAnchor,
  isContainer,
  isMapping,
  isPair,
  isQuoted,
  isSequence,
  namedWhere,
} from "./nodes.ts";

export type Component = number | string;
export type Route = readonly Component[];

const QUOTE_WIDTH = 1;
const NAME_START = 1;
const FIRST = 0;

const resolved = (
  document: Document,
  alias: SyntaxNode,
  at: number,
): Result.Result<SyntaxNode, string> =>
  Result.fromOption(
    resolveAnchor(document)(Str.slice(NAME_START)(alias.text), at),
    () => `unknown alias: ${alias.text}`,
  );

const keyText = (key: SyntaxNode): string =>
  Option.match(namedWhere((child) => !isAnchor(child))(key), {
    onNone: () => key.text,
    onSome: (scalar) => {
      if (isQuoted(scalar)) {
        return Str.slice(QUOTE_WIDTH, scalar.text.length - QUOTE_WIDTH)(scalar.text);
      }
      return scalar.text;
    },
  });

const keyOf = (child: SyntaxNode): Option.Option<SyntaxNode> => {
  if (isPair(child)) {
    return fieldOf("key")(child);
  }
  if (child.type === "flow_node") {
    return Option.some(child);
  }
  return Option.none();
};

const descendMapping = (node: SyntaxNode, expected: string): Result.Result<SyntaxNode, string> =>
  pipe(
    node.namedChildren,
    Arr.findFirst((child) => Option.exists(keyOf(child), (key) => keyText(key) === expected)),
    Option.map((child) => Option.getOrElse(fieldOf("value")(child), () => child)),
    Result.fromOption(() => `mapping has no key \`${expected}\``),
  );

const ITEMS = new Set(["block_sequence_item", "flow_node", "flow_pair"]);

export const flattenSequence = (node: SyntaxNode): Result.Result<readonly SyntaxNode[], string> =>
  Result.all(
    pipe(
      node.namedChildren,
      Arr.filter((child) => ITEMS.has(child.type)),
      Arr.map((child) => {
        if (child.type !== "block_sequence_item") {
          return Result.succeed(child);
        }
        return Result.fromOption(
          namedWhere(isContainer)(child),
          () => "block_sequence_item is empty",
        );
      }),
    ),
  );

const descendSequence = (node: SyntaxNode, index: number): Result.Result<SyntaxNode, string> =>
  Result.flatMap(flattenSequence(node), (items) =>
    pipe(
      Arr.get(items, index),
      Option.map((child) => {
        if (child.type === "flow_pair") {
          return Option.getOrElse(fieldOf("value")(child), () => child);
        }
        return child;
      }),
      Result.fromOption(
        () => `index \`[${String(index)}]\` exceeds list size (${String(items.length)})`,
      ),
    ),
  );

const firstContent = (document: Document, node: SyntaxNode): Result.Result<SyntaxNode, string> => {
  const child = namedWhere((each) => !isAnchor(each))(node);
  if (Option.isNone(child)) {
    return Result.fail(`node of kind ${node.type} has no non-anchor child`);
  }
  if (isAlias(child.value)) {
    return resolved(document, node, node.start);
  }
  return Result.succeed(child.value);
};

const step = (child: SyntaxNode, component: Component): Result.Result<SyntaxNode, string> => {
  if (isMapping(child) && Predicate.isString(component)) {
    return descendMapping(child, component);
  }
  if (isSequence(child) && Predicate.isNumber(component)) {
    return descendSequence(child, component);
  }
  return Result.fail(`unexpected node: \`${child.type}\``);
};

export const descend =
  (document: Document) =>
  (node: SyntaxNode, component: Component): Result.Result<SyntaxNode, string> =>
    Result.flatMap(firstContent(document, node), (child) => step(child, component));

export const walk =
  (document: Document) =>
  (route: Route): Result.Result<SyntaxNode, string> => {
    let focus: Result.Result<SyntaxNode, string> = Result.succeed(document.top);
    for (const component of route) {
      focus = pipe(
        focus,
        Result.flatMap((node) => descend(document)(node, component)),
      );
    }
    return focus;
  };

export const resolveTarget =
  (document: Document) =>
  (node: SyntaxNode): Result.Result<SyntaxNode, string> => {
    const first = childAt(FIRST)(node);
    if (Option.exists(first, isAlias)) {
      return resolved(document, Option.getOrThrow(first), Option.getOrThrow(first).start);
    }
    if (Option.exists(first, isAnchor)) {
      return Result.succeed(
        Option.getOrElse(namedWhere((each) => !isAnchor(each))(node), () => node),
      );
    }
    return Result.succeed(node);
  };

import { Array as Arr, Option, Predicate, pipe } from "effect";
import { SyntaxKind } from "typescript/ast";
import type { Node, SourceFile } from "typescript/ast";
import type { Context, Location, Range } from "vite-plus/lint/plugins";

import type { CompatSymbol } from "./compat-symbol.ts";
import type { CompatType } from "./compat-type.ts";
import type { CompatProgram } from "./compat.ts";
import { lazily, memoizeByKey } from "./memo.ts";

interface RangedNode {
  readonly range: Readonly<Range>;
}

interface MappedNode {
  readonly type: string;
  readonly range: Readonly<Range>;
  readonly loc: Location;
}

interface ParserServices {
  readonly program: CompatProgram;
  readonly esTreeNodeToTSNodeMap: { readonly get: (node: RangedNode) => Node };
  readonly tsNodeToESTreeNodeMap: {
    readonly get: (node: Node) => MappedNode | undefined;
  };
  readonly getTypeAtLocation: (node: RangedNode) => CompatType;
  readonly getSymbolAtLocation: (node: RangedNode) => CompatSymbol | undefined;
}

interface FileProgram {
  readonly context: Context;
  readonly program: CompatProgram;
  readonly sourceFile: SourceFile;
}

const covers = (node: Node, [start, end]: Readonly<Range>): boolean =>
  node.getStart() <= start && node.end >= end;

const spans = (node: Node, [start, end]: Readonly<Range>): boolean =>
  node.getStart() === start && node.end === end;

const innermostSpanning = (sourceFile: SourceFile, range: Readonly<Range>): Node => {
  const visit = (node: Node, found: Node): Node => {
    if (!covers(node, range)) {
      return found;
    }
    const matched = Option.liftPredicate(node, (candidate) => spans(candidate, range)).pipe(
      Option.getOrElse(() => found),
    );
    return Option.fromNullishOr(
      node.forEachChild((child) =>
        Option.liftPredicate(visit(child, matched), (deeper) => deeper !== matched).pipe(
          Option.getOrUndefined,
        ),
      ),
    ).pipe(Option.getOrElse(() => matched));
  };
  return visit(sourceFile, sourceFile);
};

const toMappedNode = ({ context }: FileProgram, node: Node): MappedNode => {
  const start = node.getStart();
  return {
    type: SyntaxKind[node.kind],
    range: [start, node.end],
    loc: {
      start: context.sourceCode.getLocFromIndex(start),
      end: context.sourceCode.getLocFromIndex(node.end),
    },
  };
};

const rangeKey = ([start, end]: Readonly<Range>): string => `${String(start)}:${String(end)}`;

const isRangedNode = (value: unknown): value is MappedNode =>
  Predicate.hasProperty(value, "type") &&
  Predicate.isString(value.type) &&
  Predicate.hasProperty(value, "range") &&
  Array.isArray(value.range);

const childNodesOf = (node: MappedNode, keys: readonly string[]): readonly MappedNode[] =>
  pipe(
    keys,
    Arr.flatMap((key) => {
      const child: unknown = Reflect.get(node, key);
      return Arr.ensure(child);
    }),
    Arr.filter(isRangedNode),
  );

const esTreeIndex = ({ context }: FileProgram): ReadonlyMap<string, MappedNode> => {
  const index = new Map<string, MappedNode>();
  const { visitorKeys } = context.sourceCode;
  const visit = (node: MappedNode): void => {
    const key = rangeKey(node.range);
    if (!index.has(key)) {
      index.set(key, node);
    }
    for (const child of childNodesOf(node, visitorKeys[node.type] ?? [])) {
      visit(child);
    }
  };
  visit(context.sourceCode.ast);
  return index;
};

const createParserServices = (file: FileProgram): ParserServices => {
  const esTreeNodes = lazily(() => esTreeIndex(file));
  const toTSNode = memoizeByKey((node: RangedNode) =>
    innermostSpanning(file.sourceFile, node.range),
  );
  const checker = file.program.getTypeChecker();
  const toESTreeNode = (node: Node): MappedNode => {
    const key = rangeKey([node.getStart(), node.end]);
    return Option.fromNullishOr(esTreeNodes().get(key)).pipe(
      Option.getOrElse(() => toMappedNode(file, node)),
    );
  };
  return {
    program: file.program,
    esTreeNodeToTSNodeMap: { get: toTSNode },
    getTypeAtLocation: (node) => checker.getTypeAtLocation(toTSNode(node)),
    getSymbolAtLocation: (node) => checker.getSymbolAtLocation(toTSNode(node)),
    tsNodeToESTreeNodeMap: {
      get: (node) =>
        Option.liftPredicate(
          node,
          (candidate) => candidate.getSourceFile().fileName === file.sourceFile.fileName,
        ).pipe(Option.map(toESTreeNode), Option.getOrUndefined),
    },
  };
};

export { createParserServices };
export type { FileProgram, MappedNode, ParserServices, RangedNode };

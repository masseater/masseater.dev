import { Predicate } from "effect";
import { SyntaxKind } from "typescript/ast";
import type { Node } from "typescript/ast";
import { isSourceFile } from "typescript/ast/is";

const CONTAINER_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.ClassExpression,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.EnumDeclaration,
  SyntaxKind.ObjectLiteralExpression,
  SyntaxKind.TypeLiteral,
  SyntaxKind.JSDocTypeLiteral,
  SyntaxKind.JsxAttributes,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.ModuleDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.MappedType,
  SyntaxKind.IndexSignature,
  SyntaxKind.SourceFile,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.Constructor,
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.MethodSignature,
  SyntaxKind.CallSignature,
  SyntaxKind.JSDocSignature,
  SyntaxKind.FunctionType,
  SyntaxKind.ConstructSignature,
  SyntaxKind.ConstructorType,
  SyntaxKind.ClassStaticBlockDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
]);

const FUNCTION_LIKE_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.Constructor,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
  SyntaxKind.ClassStaticBlockDeclaration,
  SyntaxKind.MethodSignature,
  SyntaxKind.CallSignature,
  SyntaxKind.ConstructSignature,
  SyntaxKind.IndexSignature,
  SyntaxKind.FunctionType,
  SyntaxKind.ConstructorType,
  SyntaxKind.JSDocSignature,
]);

const BLOCK_SCOPE_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.ModuleBlock,
  SyntaxKind.CatchClause,
  SyntaxKind.ForStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.CaseBlock,
]);

const isContainer = (node: Node): boolean => CONTAINER_KINDS.has(node.kind);

const isFunctionLike = (node: Node | undefined): node is Node =>
  Predicate.isNotUndefined(node) && FUNCTION_LIKE_KINDS.has(node.kind);

const isBlockScopeContainer = (node: Node): boolean =>
  isContainer(node) ||
  BLOCK_SCOPE_KINDS.has(node.kind) ||
  (node.kind === SyntaxKind.Block && !isFunctionLike(node.parent));

const hasAncestor = (node: Node, predicate: (candidate: Node) => boolean): boolean => {
  let current = node.parent;
  while (!isSourceFile(current)) {
    if (predicate(current)) {
      return true;
    }
    current = current.parent;
  }
  return false;
};

const containerIsFile = (node: Node): boolean => !hasAncestor(node, isContainer);

const blockScopeIsFile = (node: Node): boolean => !hasAncestor(node, isBlockScopeContainer);

export { blockScopeIsFile, containerIsFile, isBlockScopeContainer, isContainer, isFunctionLike };

import { Array as Arr, Predicate } from "effect";
import type { Node } from "typescript/ast";
import { isBindingElement, isVariableDeclaration } from "typescript/ast/is";

import type { FileBinding, Scope } from "./binder-declarations.ts";
import { bindExpression } from "./binder-expressions.ts";
import { DECLARATION_BINDERS } from "./binder-nodes.ts";
import { isBlockScopeContainer, isContainer } from "./binder-scopes.ts";
import { bindVariable, isReparsed } from "./binder-variables.ts";

interface Frame {
  readonly node: Node;
  readonly scope: Scope;
}

const FILE_SCOPE: Scope = { containerIsFile: true, blockIsFile: true };
const NESTED_CONTAINER_SCOPE: Scope = { containerIsFile: false, blockIsFile: false };

const childScope = (node: Node, scope: Scope): Scope => {
  if (isContainer(node)) {
    return NESTED_CONTAINER_SCOPE;
  }
  if (isBlockScopeContainer(node)) {
    return { containerIsFile: scope.containerIsFile, blockIsFile: false };
  }
  return scope;
};

const childFramesInReverse = (node: Node, scope: Scope): readonly Frame[] => {
  const frames: Frame[] = [];
  node.forEachChild((next) => {
    frames.push({ node: next, scope });
  });
  return Arr.reverse(frames);
};

const bindNode = (binding: FileBinding, node: Node, scope: Scope): void => {
  if (isVariableDeclaration(node) || isBindingElement(node)) {
    bindVariable(binding, node, scope);
    return;
  }
  const binder = DECLARATION_BINDERS.get(node.kind);
  if (Predicate.isNotUndefined(binder)) {
    binder(binding, node, scope);
    return;
  }
  bindExpression(binding, node, scope);
};

const bindFrame = (binding: FileBinding, frame: Frame): readonly Frame[] => {
  if (isReparsed(frame.node)) {
    return [];
  }
  bindNode(binding, frame.node, frame.scope);
  return childFramesInReverse(frame.node, childScope(frame.node, frame.scope));
};

const bindFileNodes = (binding: FileBinding): readonly Node[] => {
  const bound: Node[] = [];
  const stack: Frame[] = [...childFramesInReverse(binding.file, FILE_SCOPE)];
  let frame = stack.pop();
  while (Predicate.isNotUndefined(frame)) {
    bound.push(frame.node);
    stack.push(...bindFrame(binding, frame));
    frame = stack.pop();
  }
  return bound.filter((node) => !isReparsed(node));
};

export { bindFileNodes };

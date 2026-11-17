import { Array as Arr, Option, Predicate, pipe } from "effect";

import {
  SignatureKind,
  SyntaxKind,
  isArrowFunction,
  isBlock,
  isCallExpression,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isNewExpression,
  isParenthesizedExpression,
  isPropertyAccessExpression,
  isReturnStatement,
  isSpreadElement,
  isVariableDeclaration,
} from "#/shared/lib/compiler.ts";
import type {
  ArrowFunction,
  CallExpression,
  Checker,
  Expression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Node,
  ParameterDeclaration,
  SourceFile,
} from "#/shared/lib/compiler.ts";
import { problemAt } from "#/shared/lib/problem.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { descendantsOf } from "#/shared/lib/syntax.ts";

type Wrapper = FunctionDeclaration | ArrowFunction | FunctionExpression;

interface Forward {
  readonly node: Expression;
  readonly callee: Expression;
  readonly kind: SignatureKind;
  readonly arguments: readonly Expression[];
  readonly typed: boolean;
  readonly optional: boolean;
}

interface Candidate {
  readonly name: Identifier;
  readonly wrapper: Wrapper;
}

const RULE: RuleName = "pass-through-wrapper";
const SINGLE_STATEMENT = 1;
const SINGLE_DECLARATION = 1;
const THIS_PARAMETER = "this";
const NO_ARGUMENTS: readonly Expression[] = [];

const messageOf = (callee: string): string =>
  `This function only passes its parameters to ${callee} unchanged. Call ${callee} directly and delete this function.`;

const unwrapped = (expression: Expression): Expression => {
  if (isParenthesizedExpression(expression)) {
    return unwrapped(expression.expression);
  }
  return expression;
};

const isWrapperExpression = (
  expression: Expression,
): expression is ArrowFunction | FunctionExpression =>
  isArrowFunction(expression) || isFunctionExpression(expression);

const candidateOf = (node: Node): Option.Option<Candidate> => {
  if (isFunctionDeclaration(node)) {
    return pipe(
      Option.fromUndefinedOr(node.name),
      Option.map((name) => ({ name, wrapper: node })),
    );
  }
  if (!isVariableDeclaration(node) || !isIdentifier(node.name)) {
    return Option.none();
  }
  const { name } = node;
  return pipe(
    Option.fromUndefinedOr(node.initializer),
    Option.map(unwrapped),
    Option.filter(isWrapperExpression),
    Option.map((wrapper) => ({ name, wrapper })),
  );
};

const changesTheCall = (wrapper: Wrapper): boolean =>
  Predicate.isNotUndefined(wrapper.asteriskToken) ||
  Option.exists(
    Option.fromUndefinedOr(wrapper.type),
    (type) => type.kind === SyntaxKind.TypePredicate,
  ) ||
  pipe(
    wrapper.modifiers ?? [],
    Arr.some((modifier) => modifier.kind === SyntaxKind.AsyncKeyword),
  );

const returnedExpression = (wrapper: Wrapper): Option.Option<Expression> => {
  const { body } = wrapper;
  if (Predicate.isUndefined(body)) {
    return Option.none();
  }
  if (!isBlock(body)) {
    return Option.some(body);
  }
  if (body.statements.length !== SINGLE_STATEMENT) {
    return Option.none();
  }
  return pipe(
    Arr.head(body.statements),
    Option.filter((statement) => isReturnStatement(statement)),
    Option.flatMap((statement) => Option.fromUndefinedOr(statement.expression)),
  );
};

const callForward = (call: CallExpression): Forward => ({
  node: call,
  callee: call.expression,
  kind: SignatureKind.Call,
  arguments: call.arguments,
  typed: Predicate.isNotUndefined(call.typeArguments),
  optional: Predicate.isNotUndefined(call.questionDotToken),
});

const forwardOf = (expression: Expression): Option.Option<Forward> => {
  const inner = unwrapped(expression);
  if (isCallExpression(inner)) {
    return Option.some(callForward(inner));
  }
  if (isNewExpression(inner)) {
    return Option.some({
      node: inner,
      callee: inner.expression,
      kind: SignatureKind.Construct,
      arguments: inner.arguments ?? NO_ARGUMENTS,
      typed: Predicate.isNotUndefined(inner.typeArguments),
      optional: false,
    });
  }
  return Option.none();
};

const rootOf = (callee: Expression): Option.Option<Identifier> => {
  if (isIdentifier(callee)) {
    return Option.some(callee);
  }
  if (
    isPropertyAccessExpression(callee) &&
    Predicate.isUndefined(callee.questionDotToken) &&
    isIdentifier(callee.name)
  ) {
    return rootOf(callee.expression);
  }
  return Option.none();
};

const parameterName = (parameter: ParameterDeclaration): Option.Option<string> => {
  const { name } = parameter;
  if (
    !isIdentifier(name) ||
    Predicate.isNotUndefined(parameter.initializer) ||
    name.text === THIS_PARAMETER
  ) {
    return Option.none();
  }
  return Option.some(name.text);
};

const isRest = (parameter: ParameterDeclaration): boolean =>
  Predicate.isNotUndefined(parameter.dotDotDotToken);

const forwardsParameter = ([parameter, name, argument]: readonly [
  ParameterDeclaration,
  string,
  Expression,
]): boolean => {
  if (!isRest(parameter)) {
    return isIdentifier(argument) && argument.text === name;
  }
  return (
    isSpreadElement(argument) &&
    isIdentifier(argument.expression) &&
    argument.expression.text === name
  );
};

const forwardedNames = (wrapper: Wrapper, forward: Forward): Option.Option<readonly string[]> => {
  const { parameters } = wrapper;
  const names = pipe(parameters, Arr.map(parameterName), Arr.getSomes);
  if (names.length !== parameters.length || forward.arguments.length !== parameters.length) {
    return Option.none();
  }
  const triples = Arr.zipWith(
    Arr.zip(parameters, names),
    forward.arguments,
    ([parameter, name], argument) => [parameter, name, argument] as const,
  );
  return pipe(
    Option.some(names),
    Option.filter(() => pipe(triples, Arr.every(forwardsParameter))),
  );
};

const calleeTakesExactly =
  (checker: Checker) =>
  (forward: Forward, count: number): boolean => {
    const signatures = checker.getSignaturesOfType(
      checker.getTypeAtLocation(forward.callee),
      forward.kind,
    );
    return (
      Arr.isReadonlyArrayNonEmpty(signatures) &&
      pipe(
        signatures,
        Arr.every(
          (signature) =>
            !signature.hasRestParameter &&
            signature.parameters.length === count &&
            !Arr.isReadonlyArrayNonEmpty(signature.typeParameters ?? []),
        ),
      )
    );
  };

const keepsTheReturnType =
  (checker: Checker) =>
  (wrapper: Wrapper, forward: Forward): boolean =>
    Option.match(Option.fromUndefinedOr(wrapper.type), {
      onNone: () => true,
      onSome: (type) =>
        checker.getTypeAtLocation(type).id === checker.getTypeAtLocation(forward.node).id,
    });

const isOverloaded =
  (checker: Checker) =>
  (name: Identifier): boolean =>
    Option.exists(
      Option.fromUndefinedOr(checker.getSymbolAtLocation(name)),
      (symbol) => symbol.declarations.length > SINGLE_DECLARATION,
    );

const callsAnotherFunction = (
  { name }: Candidate,
  forward: Forward,
  names: readonly string[],
): boolean =>
  Option.exists(
    rootOf(forward.callee),
    (root) => root.text !== name.text && !names.includes(root.text),
  );

const isPassThrough =
  (checker: Checker) =>
  (candidate: Candidate) =>
  (forward: Forward): boolean => {
    const { wrapper, name } = candidate;
    if (forward.typed || forward.optional) {
      return false;
    }
    const restForwarded = pipe(wrapper.parameters, Arr.some(isRest));
    return (
      Option.exists(forwardedNames(wrapper, forward), (names) =>
        callsAnotherFunction(candidate, forward, names),
      ) &&
      (restForwarded || calleeTakesExactly(checker)(forward, wrapper.parameters.length)) &&
      keepsTheReturnType(checker)(wrapper, forward) &&
      !isOverloaded(checker)(name)
    );
  };

const problemOf =
  (checker: Checker) =>
  (candidate: Candidate): Option.Option<Problem> => {
    if (changesTheCall(candidate.wrapper)) {
      return Option.none();
    }
    return pipe(
      returnedExpression(candidate.wrapper),
      Option.flatMap(forwardOf),
      Option.filter(isPassThrough(checker)(candidate)),
      Option.map((forward) =>
        problemAt({ rule: RULE, message: messageOf(forward.callee.getText()) })(candidate.name),
      ),
    );
  };

export const passThroughWrappersIn =
  (checker: Checker) =>
  (sourceFile: SourceFile): readonly Problem[] =>
    pipe(
      descendantsOf(sourceFile),
      Arr.map(candidateOf),
      Arr.getSomes,
      Arr.map(problemOf(checker)),
      Arr.getSomes,
    );

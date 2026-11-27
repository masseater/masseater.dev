import { withTypeInformation } from "@r_masseater/oxlint-typed-rules";
import type { ParserServices, TypedContext } from "@r_masseater/oxlint-typed-rules";
import { Array as Arr, Match, Option, String as Str, pipe } from "effect";
import type { Node } from "typescript/ast";
import { isTypeNode } from "typescript/ast/is";
import type { Type } from "typescript/sync";
import type { ESTree, Rule, Visitor } from "vite-plus/lint/plugins";

import { ELEMENT, writablePartOf } from "./writable-part.ts";
import type { Mutability, WritablePart } from "./writable-part.ts";

const MESSAGE =
  "A function must not be able to change its arguments, but {{part}}. Declare the parameter with a read-only type. Types declared by a package or by the language are exempt unless the language has a read-only form of them.";
const MESSAGE_ID = "shouldBeReadonly";
const WHOLE = "the type";
const SEPARATOR = ".";
const TAGGABLE: readonly string[] = ["string", "number", "bigint"];

type Annotated = ESTree.FormalParameter | ESTree.FormalParameterRest;

type FunctionLike =
  | ESTree.ArrowFunctionExpression
  | ESTree.Function
  | ESTree.TSCallSignatureDeclaration
  | ESTree.TSConstructSignatureDeclaration
  | ESTree.TSFunctionType
  | ESTree.TSMethodSignature;

const isBrandObject = (type: Type): boolean =>
  type.isObjectType() &&
  Arr.isReadonlyArrayEmpty(type.getCallSignatures()) &&
  Arr.isReadonlyArrayEmpty(type.getConstructSignatures());

const isTaggable = (type: Type): boolean =>
  type.isLiteralType() ||
  type.isTemplateLiteralType() ||
  (type.isIntrinsicType() && Arr.contains(TAGGABLE, type.intrinsicName));

const isBrandedLiteral = (type: Type): boolean => {
  if (!type.isIntersectionType()) {
    return false;
  }
  const parts = type.getTypes();
  const objects = pipe(parts, Arr.filter(isBrandObject));
  const primitives = pipe(parts, Arr.filter(isTaggable));
  return (
    Arr.isReadonlyArrayNonEmpty(objects) &&
    Arr.isReadonlyArrayNonEmpty(primitives) &&
    objects.length + primitives.length === parts.length
  );
};

const isBrandedLiteralLike = (type: Type): boolean => {
  if (type.isUnionType()) {
    return pipe(type.getTypes(), Arr.every(isBrandedLiteral));
  }
  return isBrandedLiteral(type);
};

const outermost = (node: Node): Node =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.filter((parent) => parent.getStart() === node.getStart() && parent.end === node.end),
    Option.match({ onNone: () => node, onSome: outermost }),
  );

const unwrapped = (parameter: ESTree.ParamPattern): Annotated => {
  if (parameter.type === "TSParameterProperty") {
    return parameter.parameter;
  }
  return parameter;
};

const annotationOf = (parameter: Annotated): Option.Option<ESTree.TSTypeAnnotation> => {
  if (parameter.type === "AssignmentPattern") {
    return Option.fromNullishOr(parameter.left.typeAnnotation);
  }
  return Option.fromNullishOr(parameter.typeAnnotation);
};

const annotatedType = (services: ParserServices, parameter: Annotated): Option.Option<Type> =>
  pipe(
    annotationOf(parameter),
    Option.map((annotation) =>
      outermost(services.esTreeNodeToTSNodeMap.get(annotation.typeAnnotation)),
    ),
    Option.filter(isTypeNode),
    Option.map((node) => services.program.native.checker.getTypeFromTypeNode(node)),
  );

const subjectOf = (path: readonly string[]): string => {
  if (Arr.isReadonlyArrayEmpty(path)) {
    return WHOLE;
  }
  return `\`${pipe(Arr.join(path, SEPARATOR), Str.replaceAll(`${SEPARATOR}${ELEMENT}`, ELEMENT))}\``;
};

const predicateOf = Match.type<Mutability>().pipe(
  Match.discriminatorsExhaustive("kind")({
    array: () => "is a mutable array",
    tuple: () => "is a mutable tuple",
    property: () => "is writable",
    index: () => "has a writable index signature",
    form: ({ name, readonlyName }) =>
      `is a \`${name}\`, which has the read-only form \`${readonlyName}\``,
  }),
);

const describe = ({ path, mutability }: WritablePart): string =>
  `${subjectOf(path)} ${predicateOf(mutability)}`;

const visitorOf = (context: TypedContext, services: ParserServices): Visitor => {
  const partOf = writablePartOf(services.program.native);
  const check = ({ params }: FunctionLike): void => {
    for (const parameter of pipe(params, Arr.map(unwrapped))) {
      const part = pipe(
        annotatedType(services, parameter),
        Option.filter((type) => !isBrandedLiteralLike(type)),
        Option.flatMap(partOf),
      );
      if (Option.isSome(part)) {
        context.report({
          node: parameter,
          messageId: MESSAGE_ID,
          data: { part: describe(part.value) },
        });
      }
    }
  };
  return {
    ArrowFunctionExpression: check,
    FunctionDeclaration: check,
    FunctionExpression: check,
    TSCallSignatureDeclaration: check,
    TSConstructSignatureDeclaration: check,
    TSDeclareFunction: check,
    TSEmptyBodyFunctionExpression: check,
    TSFunctionType: check,
    TSMethodSignature: check,
  };
};

export const readonlyParameters: Rule = withTypeInformation({
  meta: {
    type: "suggestion",
    messages: { [MESSAGE_ID]: MESSAGE },
  },
  create: (context: TypedContext) =>
    pipe(
      Option.fromNullishOr(context.sourceCode.parserServices),
      Option.match({
        onNone: (): Visitor => ({}),
        onSome: (services) => visitorOf(context, services),
      }),
    ),
});

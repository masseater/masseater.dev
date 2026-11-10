import { Option, Predicate, Record, pipe } from "effect";
import type { Context, CreateRule, RuleMeta, Visitor } from "vite-plus/lint/plugins";

import { lazily } from "./memo.ts";
import { createParserServices } from "./parser-services.ts";
import type { ParserServices } from "./parser-services.ts";
import { programFor } from "./program.ts";

type TypedSourceCode = Context["sourceCode"] & {
  readonly parserServices: ParserServices | undefined;
};

type TypedContext = Omit<Context, "sourceCode"> & { readonly sourceCode: TypedSourceCode };

interface TypedRule {
  readonly meta: RuleMeta;
  readonly create: (context: TypedContext) => Visitor;
}

const isTypedRule = <Rule>(rule: Rule): rule is Rule & TypedRule =>
  Predicate.hasProperty(rule, "meta") &&
  Predicate.hasProperty(rule, "create") &&
  Predicate.isFunction(rule.create);

const isTypedContext = (value: unknown): value is TypedContext =>
  Predicate.hasProperty(value, "report") &&
  Predicate.hasProperty(value, "sourceCode") &&
  Predicate.hasProperty(value.sourceCode, "parserServices");

const inheriting = (
  prototype: object,
  name: string,
  descriptor: Readonly<PropertyDescriptor>,
): unknown => Object.create(prototype, { [name]: { ...descriptor, enumerable: true } });

const parserServicesOf = (context: Context): Option.Option<ParserServices> =>
  programFor({ fileName: context.filename, text: context.sourceCode.text }).pipe(
    Option.flatMap((program) =>
      Option.fromNullishOr(program.getSourceFile(context.filename)).pipe(
        Option.map((sourceFile) => createParserServices({ context, program, sourceFile })),
      ),
    ),
  );

const withParserServices = (
  context: Context,
  parserServices: () => ParserServices | undefined,
): TypedContext => {
  const sourceCode = inheriting(context.sourceCode, "parserServices", { get: parserServices });
  return Option.liftPredicate(
    inheriting(context, "sourceCode", { value: sourceCode }),
    isTypedContext,
  ).pipe(Option.getOrThrowWith(() => new TypeError("The rule context has no source code.")));
};

const withTypeInformation = (rule: TypedRule): CreateRule => ({
  meta: rule.meta,
  create: (context) =>
    parserServicesOf(context).pipe(
      Option.map((parserServices) =>
        rule.create(withParserServices(context, () => parserServices)),
      ),
      Option.getOrElse(() => ({})),
    ),
});

const withOptionalTypeInformation = (rule: TypedRule): CreateRule => ({
  meta: rule.meta,
  create: (context) =>
    rule.create(
      withParserServices(
        context,
        lazily(() => Option.getOrUndefined(parserServicesOf(context))),
      ),
    ),
});

const typedRules = (
  rules: Record.ReadonlyRecord<string, unknown>,
): Record.ReadonlyRecord<string, CreateRule> =>
  pipe(rules, Record.filter(isTypedRule), Record.map(withTypeInformation));

const optionallyTypedRules = (
  rules: Record.ReadonlyRecord<string, unknown>,
): Record.ReadonlyRecord<string, CreateRule> =>
  pipe(rules, Record.filter(isTypedRule), Record.map(withOptionalTypeInformation));

export type { TypedContext, TypedRule, TypedSourceCode };
export {
  isTypedRule,
  optionallyTypedRules,
  typedRules,
  withOptionalTypeInformation,
  withTypeInformation,
};

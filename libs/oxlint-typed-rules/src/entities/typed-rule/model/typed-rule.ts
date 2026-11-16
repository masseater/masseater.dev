import { Option, Predicate, Record, pipe } from "effect";
import type { Context, CreateRule, RuleMeta, Visitor } from "vite-plus/lint/plugins";

import { lazily } from "#/shared/lib/memo.ts";
import { programFor } from "#/shared/lib/program.ts";

import { createParserServices } from "./parser-services.ts";
import type { ParserServices } from "./parser-services.ts";

export type TypedSourceCode = Context["sourceCode"] & {
  readonly parserServices: ParserServices | undefined;
};

export type TypedContext = Omit<Context, "sourceCode"> & { readonly sourceCode: TypedSourceCode };

export interface TypedRule {
  readonly meta: RuleMeta;
  readonly create: (context: TypedContext) => Visitor;
}

export const isTypedRule = <Rule>(rule: Rule): rule is Rule & TypedRule =>
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

export const withTypeInformation = (rule: TypedRule): CreateRule => ({
  meta: rule.meta,
  create: (context) =>
    parserServicesOf(context).pipe(
      Option.map((parserServices) =>
        rule.create(withParserServices(context, () => parserServices)),
      ),
      Option.getOrElse(() => ({})),
    ),
});

export const withOptionalTypeInformation = (rule: TypedRule): CreateRule => ({
  meta: rule.meta,
  create: (context) =>
    rule.create(
      withParserServices(
        context,
        lazily(() => Option.getOrUndefined(parserServicesOf(context))),
      ),
    ),
});

export const typedRules = (
  rules: Record.ReadonlyRecord<string, unknown>,
): Record.ReadonlyRecord<string, CreateRule> =>
  pipe(rules, Record.filter(isTypedRule), Record.map(withTypeInformation));

export const optionallyTypedRules = (
  rules: Record.ReadonlyRecord<string, unknown>,
): Record.ReadonlyRecord<string, CreateRule> =>
  pipe(rules, Record.filter(isTypedRule), Record.map(withOptionalTypeInformation));

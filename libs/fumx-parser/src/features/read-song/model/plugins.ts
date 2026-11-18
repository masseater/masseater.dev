import { Array as Arr, Match, Option, pipe } from "effect";
import { AstUtils, UriUtils } from "langium";
import type { URI } from "langium";

import type { Plugin, PluginUse, PluginValue } from "#/entities/song/index.ts";
import { isPlugin, isPluginUse } from "#generated/langium/ast.ts";
import type {
  Declaration,
  Literal,
  Plugin as PluginNode,
  PluginArgument,
  PluginParam,
  PluginUse as PluginUseNode,
} from "#generated/langium/ast.ts";

import { problemAt } from "./problem.ts";
import type { Compiled, From, Problem } from "./problem.ts";
import { fits, scalar, typeName, typeOfValue } from "./types.ts";
import { literalValue } from "./values.ts";
import type { Value } from "./values.ts";

const HUNDRED = 100;

export const pathFrom: From<URI, From<URI, From<string, string>>> = (home) => (module) => (path) =>
  UriUtils.relative(UriUtils.dirname(home), UriUtils.resolvePath(UriUtils.dirname(module), path));

const moduleFor: From<PluginUseNode, From<PluginNode, string>> = (use) => (plugin) => {
  const home = AstUtils.getDocument(use).uri;
  const there = AstUtils.getDocument(plugin).uri;
  if (home.toString() === there.toString()) {
    return plugin.module;
  }
  return pathFrom(home)(there)(plugin.module);
};

const pluginValueOf: From<Value, Option.Option<PluginValue>> = (value) =>
  Match.value(value).pipe(
    Match.discriminatorsExhaustive("kind")({
      number: (number) => Option.some<PluginValue>({ kind: "number", value: number.value }),
      decibels: (amount) => Option.some<PluginValue>({ kind: "decibels", value: amount.value }),
      percent: (amount) =>
        Option.some<PluginValue>({ kind: "share", value: amount.value / HUNDRED }),
      hertz: (amount) => Option.some<PluginValue>({ kind: "hertz", value: amount.value }),
      time: (amount) => Option.some<PluginValue>({ kind: "milliseconds", value: amount.value }),
      semitones: (amount) => Option.some<PluginValue>({ kind: "semitones", value: amount.value }),
      duration: (duration) => Option.some<PluginValue>({ kind: "ticks", value: duration.ticks }),
      pitch: (pitch) =>
        Option.some<PluginValue>({ kind: "pitch", midi: pitch.midi, cents: pitch.cents }),
      string: (text) => Option.some<PluginValue>({ kind: "text", value: text.value }),
      bool: (truth) => Option.some<PluginValue>({ kind: "flag", value: truth.value }),
      list: () => Option.none(),
      none: () => Option.none(),
    }),
  );

const typedValueOf: From<readonly [PluginParam, Literal], Compiled<Option.Option<PluginValue>>> = ([
  param,
  literal,
]) => {
  const wanted = scalar(param.type.name);
  const read = literalValue(literal);
  const value = pipe(
    read,
    Option.flatMap((found) => pluginValueOf(found)),
  );
  const actual = pipe(
    read,
    Option.map((found) => typeOfValue(found)),
  );
  if (Option.isSome(value) && Option.isSome(actual) && fits(wanted)(actual.value)) {
    return { value, problems: [] };
  }
  const shown = Option.match(actual, {
    onNone: () => "読めない値",
    onSome: (type) => typeName(type),
  });
  return {
    value: Option.none(),
    problems: [
      problemAt(literal)("$type")(
        `${param.name} には ${param.type.name} を渡します。${shown} は渡せません`,
      ),
    ],
  };
};

const paramOf: From<PluginParam, Compiled<Plugin["params"][number]>> = (param) => {
  const fallback = pipe(
    Option.fromNullishOr(param.default),
    Option.map((literal) => typedValueOf([param, literal])),
  );
  return {
    value: {
      name: param.name,
      type: param.type.name,
      default: pipe(
        fallback,
        Option.flatMap((compiled) => compiled.value),
      ),
    },
    problems: Option.match(fallback, { onNone: () => [], onSome: (compiled) => compiled.problems }),
  };
};

const pluginOf: From<PluginNode, Compiled<Plugin>> = (node) => {
  const params = pipe(
    node.params,
    Arr.map((param) => paramOf(param)),
  );
  return {
    value: {
      name: node.name,
      module: node.module,
      params: pipe(
        params,
        Arr.map((param) => param.value),
      ),
    },
    problems: pipe(
      params,
      Arr.flatMap((param) => param.problems),
    ),
  };
};

type Argument = PluginUse["arguments"][number];

const argumentOf: From<PluginUseNode, From<PluginParam, Compiled<Option.Option<Argument>>>> =
  (use) => (param) =>
    pipe(
      use.arguments,
      Arr.findFirst((argument) => argument.name === param.name),
      Option.match({
        onNone: () => {
          const fallback = pipe(
            Option.fromNullishOr(param.default),
            Option.flatMap((literal) => typedValueOf([param, literal]).value),
          );
          if (Option.isSome(fallback)) {
            return {
              value: Option.some({ name: param.name, value: fallback.value }),
              problems: [],
            };
          }
          return {
            value: Option.none(),
            problems: [problemAt(use)("plugin")(`${param.name} を渡します`)],
          };
        },
        onSome: (argument) => {
          const typed = typedValueOf([param, argument.value]);
          return {
            value: pipe(
              typed.value,
              Option.map((value) => ({ name: param.name, value })),
            ),
            problems: typed.problems,
          };
        },
      }),
    );

const strayProblemsOf: From<
  readonly [PluginNode, readonly PluginArgument[]],
  readonly Problem[]
> = ([plugin, args]) =>
  pipe(
    args,
    Arr.filter((argument, index) => {
      const known = pipe(
        plugin.params,
        Arr.some((param) => param.name === argument.name),
      );
      const first = pipe(
        args,
        Arr.findFirstIndex((other) => other.name === argument.name),
      );
      return !known || Option.exists(first, (at) => at < index);
    }),
    Arr.map((argument) =>
      problemAt(argument)("name")(`${plugin.name} の ${argument.name} は無いか、2 回渡しています`),
    ),
  );

export const argumentsOf: From<readonly PluginArgument[], readonly Argument[]> = (given) =>
  pipe(
    given,
    Arr.flatMap((argument) =>
      pipe(
        literalValue(argument.value),
        Option.flatMap((value) => pluginValueOf(value)),
        Option.map((value) => ({ name: argument.name, value })),
        Option.toArray,
      ),
    ),
  );

export const pluginUseOf: From<PluginUseNode, Compiled<PluginUse>> = (use) =>
  pipe(
    Option.fromNullishOr(use.plugin.ref),
    Option.match({
      onNone: () => ({
        value: { kind: "plugin", plugin: use.plugin.$refText, module: "", arguments: [] },
        problems: [],
      }),
      onSome: (plugin): Compiled<PluginUse> => {
        const args = pipe(
          plugin.params,
          Arr.map((param) => argumentOf(use)(param)),
        );
        return {
          value: {
            kind: "plugin",
            plugin: plugin.name,
            module: moduleFor(use)(plugin),
            arguments: pipe(
              args,
              Arr.flatMap((argument) => Option.toArray(argument.value)),
            ),
          },
          problems: [
            ...pipe(
              args,
              Arr.flatMap((argument) => argument.problems),
            ),
            ...strayProblemsOf([plugin, use.arguments]),
          ],
        };
      },
    }),
  );

const usesIn: From<Declaration, readonly PluginUseNode[]> = (declaration) =>
  AstUtils.streamAst(declaration)
    .filter((node) => isPluginUse(node))
    .toArray();

export const pluginsOf: From<readonly Declaration[], Compiled<readonly Plugin[]>> = (
  declarations,
) => {
  const plugins = pipe(
    declarations,
    Arr.filter((declaration) => isPlugin(declaration)),
    Arr.map((plugin) => pluginOf(plugin)),
  );
  return {
    value: pipe(
      plugins,
      Arr.map((plugin) => plugin.value),
    ),
    problems: [
      ...pipe(
        plugins,
        Arr.flatMap((plugin) => plugin.problems),
      ),
      ...pipe(
        declarations,
        Arr.flatMap((declaration) => usesIn(declaration)),
        Arr.flatMap((use) => pluginUseOf(use).problems),
      ),
    ],
  };
};

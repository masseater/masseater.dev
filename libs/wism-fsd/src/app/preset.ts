import { definePlugin, defineRule } from "@r_masseater/wism";
import type { GraphEdge, Plugin, Rule, RuleEntry, WismConfig } from "@r_masseater/wism";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { Kind } from "#/entities/kind/index.ts";
import { makeLayout } from "#/entities/layout/index.ts";
import {
  CROSS_SLICE,
  LAYER_IMPORT,
  LINK_TARGET,
  PUBLIC_API,
  WILDCARD_EXPORT,
  checkImports,
} from "#/features/check-imports/index.ts";
import {
  LAYER_NAME,
  LOOSE_FILE,
  PLACEMENT,
  checkPlacement,
} from "#/features/check-placement/index.ts";
import type { Finding } from "#/shared/lib/finding.ts";

export const FSD_PLUGIN = "fsd";

const DESCRIPTIONS: Readonly<Record<string, string>> = {
  [PLACEMENT]: "Each file sits where its kind allows",
  [LOOSE_FILE]: "No module sits directly in the layers directory",
  [LAYER_NAME]: "Each directory under the layers directory is a layer",
  [LAYER_IMPORT]: "A layer only uses the layers below it",
  [CROSS_SLICE]: "Slices of one layer do not use each other",
  [PUBLIC_API]: "Other slices are used through their entry file",
  [WILDCARD_EXPORT]: "An entry file names what it exports",
  [LINK_TARGET]: "A Markdown link points at a tracked file",
};

const ERROR: RuleEntry = "error";

export interface FsdPresetOptions {
  readonly kinds: readonly Kind[];
  readonly ignores?: readonly string[];
}

type Grouped = Readonly<Record<string, readonly Finding[]>>;

const analyze = (
  kinds: readonly Kind[],
): ((files: readonly string[], edges: readonly GraphEdge[]) => Grouped) => {
  const cache = new WeakMap<readonly string[], Grouped>();
  const compute = (files: readonly string[], edges: readonly GraphEdge[]): Grouped => {
    const layout = makeLayout(kinds)(files);
    const grouped = Arr.groupBy(
      Arr.appendAll(checkPlacement(layout), checkImports(edges)(layout)),
      ({ rule }) => rule,
    );
    cache.set(files, grouped);
    return grouped;
  };
  return (files, edges) =>
    Option.getOrElse(Option.fromNullishOr(cache.get(files)), () => compute(files, edges));
};

export const fsdPlugin = (kinds: readonly Kind[]): Plugin => {
  const findings = analyze(kinds);
  const ruleOf = (description: string, name: string): Rule =>
    defineRule({
      meta: { description },
      check: ({ files, edges, report }) => {
        for (const { path, line, column, message } of findings(files, edges)[name] ?? []) {
          report({ path, line, column, message });
        }
      },
    });
  return definePlugin({ rules: pipe(DESCRIPTIONS, Rec.map(ruleOf)) });
};

export const fsdPreset = ({ kinds, ignores }: FsdPresetOptions): WismConfig => ({
  plugins: { [FSD_PLUGIN]: fsdPlugin(kinds) },
  rules: pipe(
    Rec.keys(DESCRIPTIONS),
    Arr.map((name) => [`${FSD_PLUGIN}/${name}`, ERROR] as const),
    Rec.fromEntries,
  ),
  ...Option.match(Option.fromNullishOr(ignores), {
    onNone: () => ({}),
    onSome: (value) => ({ ignores: value }),
  }),
});

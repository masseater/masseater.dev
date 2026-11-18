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

export const STRUCTURE_PLUGIN = "structure";

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

export const PRESETS = {
  fsd: [LAYER_NAME, LOOSE_FILE, LAYER_IMPORT, CROSS_SLICE, PUBLIC_API, WILDCARD_EXPORT],
  placement: [PLACEMENT],
  links: [LINK_TARGET],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type PresetName = keyof typeof PRESETS;

const ALL: readonly PresetName[] = ["fsd", "placement", "links"];

export interface StructureOptions {
  readonly kinds: readonly Kind[];
  readonly presets?: readonly PresetName[];
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

export const structurePlugin = (kinds: readonly Kind[]): Plugin => {
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

const rulesOf = (presets: readonly PresetName[]): Readonly<Record<string, RuleEntry>> =>
  pipe(
    presets,
    Arr.flatMap((name): readonly string[] => PRESETS[name]),
    Arr.dedupe,
    Arr.map((rule) => [`${STRUCTURE_PLUGIN}/${rule}`, ERROR] as const),
    Rec.fromEntries,
  );

export const structure = ({ kinds, presets = ALL, ignores }: StructureOptions): WismConfig => ({
  plugins: { [STRUCTURE_PLUGIN]: structurePlugin(kinds) },
  rules: rulesOf(presets),
  ...Option.match(Option.fromNullishOr(ignores), {
    onNone: () => ({}),
    onSome: (value) => ({ ignores: value }),
  }),
});

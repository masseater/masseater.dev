import { callAddon, present, sortByPosition, traceparent } from "@masseater.dev/lint-host";
import { Array as Arr, Effect } from "effect";

import { resolve, unknownRules } from "#/entities/rule/index.ts";
import { runScriptRules } from "#/features/run-rules/index.ts";
import type { Diagnostic, WismConfig } from "#/shared/config/index.ts";
import { WismError, failedWith } from "#/shared/lib/errors.ts";
import { decodeGraph, native } from "#/shared/native/index.ts";
import type { NativeOptions } from "#/shared/native/index.ts";

export interface LintInput {
  readonly root: string;
  readonly files: readonly string[];
  readonly config?: WismConfig;
}

const checkRules = (config: WismConfig): Effect.Effect<void, WismError> =>
  Arr.match(unknownRules(config), {
    onEmpty: () => Effect.void,
    onNonEmpty: (names) =>
      Effect.fail(
        WismError.make({
          message: `rules that no configured plugin defines: ${Arr.join(names, ", ")}. Name each rule plugin/rule.`,
        }),
      ),
  });

const collectEdges = Effect.fn("wism.collect_edges")(function* collectEdges(input: LintInput) {
  const parent = yield* traceparent;
  const options: NativeOptions = present(parent, (value) => ({ traceparent: value }));
  const words = yield* callAddon({
    addon: native,
    name: "wism",
    files: input.files.length,
    call: (addon) => addon.collect(input.root, input.files, options),
    failWith: failedWith,
  });
  return yield* Effect.sync(() => decodeGraph(input.files)(words)).pipe(
    Effect.withSpan("wism.decode"),
  );
});

export const lint = Effect.fn("wism.lint")(function* lint(input: LintInput) {
  const config = input.config ?? {};
  yield* checkRules(config);
  const rules = resolve(config);
  if (Arr.isReadonlyArrayEmpty(rules)) {
    return [];
  }
  const edges = yield* collectEdges(input);
  const found = yield* Effect.sync(() =>
    runScriptRules(rules)({ root: input.root, files: input.files, edges }),
  ).pipe(Effect.withSpan("wism.script_rules", { attributes: { "wism.edges": edges.length } }));
  return sortByPosition<Diagnostic>(found);
});

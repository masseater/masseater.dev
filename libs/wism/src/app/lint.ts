import { callAddon, present, sortByPosition, traceparent } from "@r_masseater/lint-host";
import { Array as Arr, Effect } from "effect";

import { resolve, unknownPlugins } from "#/entities/rule/index.ts";
import { runScriptRules } from "#/features/run-rules/index.ts";
import type { Diagnostic, WismConfig } from "#/shared/config/index.ts";
import { WismError, failedWith } from "#/shared/lib/errors.ts";
import { native } from "#/shared/native/index.ts";
import type { NativeOptions } from "#/shared/native/index.ts";

export interface LintInput {
  readonly root: string;
  readonly files: readonly string[];
  readonly config?: WismConfig;
}

const checkPlugins = (config: WismConfig): Effect.Effect<void, WismError> =>
  Arr.match(unknownPlugins(config), {
    onEmpty: () => Effect.void,
    onNonEmpty: (names) =>
      Effect.fail(
        WismError.make({
          message: `rules name plugins that are not configured: ${Arr.join(names, ", ")}`,
        }),
      ),
  });

export const lint = Effect.fn("wism.lint")(function* lint(input: LintInput) {
  const config = input.config ?? {};
  yield* checkPlugins(config);
  const resolved = resolve(config);
  const parent = yield* traceparent;
  const keepGraph = Arr.isReadonlyArrayNonEmpty(resolved.scripts);
  const options: NativeOptions = {
    config: { kinds: config.kinds ?? [], rules: resolved.builtin },
    keepGraph,
    ...present(parent, (value) => ({ traceparent: value })),
  };
  const report = yield* callAddon({
    addon: native,
    name: "wism",
    files: input.files.length,
    call: (addon) => addon.lint(input.root, input.files, options),
    failWith: failedWith,
  });
  const scripted = runScriptRules(resolved.scripts)({
    files: input.files,
    nodes: report.nodes ?? [],
    edges: report.edges ?? [],
  });
  return sortByPosition<Diagnostic>([...report.diagnostics, ...scripted]);
});

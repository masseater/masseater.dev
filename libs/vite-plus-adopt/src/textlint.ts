import { loadPackagesFromRawConfig } from "@textlint/config-loader";
import type { TextlintLoadPackagesFromRawConfigResult } from "@textlint/config-loader";
import { TextlintKernelDescriptor } from "@textlint/kernel";
import { Effect, Path, Array as Arr, pipe, Function as Fn } from "effect";
import { createLinter, loadLinterFormatter } from "textlint";
import { builtInPlugins } from "textlint/lib/src/loader/TextlintrcLoader.js";

import { attempt } from "./attempt.ts";
import { toolFailed } from "./errors.ts";
import type { VpToolsError } from "./errors.ts";
import type { Report } from "./report.ts";
import type { TextlintConfig } from "./types.ts";

const DATA_FIRST_ARITY_3 = 3;

const descriptorOf = (
  loaded: TextlintLoadPackagesFromRawConfigResult,
  root: string,
): Effect.Effect<TextlintKernelDescriptor, VpToolsError> => {
  if (!loaded.ok) {
    return Effect.fail(toolFailed("textlint")(loaded.error.message));
  }
  return Effect.succeed(
    new TextlintKernelDescriptor({
      rules: loaded.config.rules,
      filterRules: loaded.config.filterRules,
      plugins: [...builtInPlugins, ...loaded.config.plugins],
      configBaseDir: root,
    }),
  );
};

const lintTexts: {
  (
    root: string,
    files: readonly string[],
  ): (config: TextlintConfig) => Effect.Effect<Report, VpToolsError, Path.Path>;
  (
    config: TextlintConfig,
    root: string,
    files: readonly string[],
  ): Effect.Effect<Report, VpToolsError, Path.Path>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
    config: TextlintConfig,
    root: string,
    files: readonly string[],
  ): Effect.Effect<Report, VpToolsError, Path.Path> =>
    Effect.gen(function* lint() {
      const path = yield* Path.Path;
      const { ignores: _ignores, ...rawConfig } = config;
      const loaded = yield* attempt("textlint")(() =>
        loadPackagesFromRawConfig({ rawConfig, node_moduleDir: path.join(root, "node_modules") }),
      );
      const descriptor = yield* descriptorOf(loaded, root);
      const absolute = pipe(
        files,
        Arr.map((file) => path.join(root, file)),
      );
      const results = yield* attempt("textlint")(() =>
        createLinter({ descriptor }).lintFiles([...absolute]),
      );
      const formatter = yield* attempt("textlint")(() =>
        loadLinterFormatter({ formatterName: "stylish", color: false }),
      );
      return {
        valid: pipe(
          results,
          Arr.every((result) => Arr.isArrayEmpty(result.messages)),
        ),
        output: formatter.format(results),
      };
    }),
);

/** @internal */
export { lintTexts };

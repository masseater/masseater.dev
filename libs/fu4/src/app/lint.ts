import { callAddon, present, sortByPosition, traceparent } from "@masseater.dev/lint-host";
import { Array as Arr, Config, Effect, Option, Redacted, pipe } from "effect";

import type { AuditConfig, Diagnostic, Fu4Config } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import { native } from "#/shared/native/index.ts";
import type { NativeAuditOptions, NativeOptions, NativeResult } from "#/shared/native/index.ts";

export interface LintInput {
  readonly root: string;
  readonly files: readonly string[];
  readonly config?: Fu4Config;
}

const diagnosticsOf = (result: NativeResult): readonly Diagnostic[] =>
  pipe(
    result.diagnostics,
    Arr.map((diagnostic): Diagnostic => ({
      path: result.path,
      line: diagnostic.line,
      column: diagnostic.column,
      rule: diagnostic.kind,
      message: diagnostic.message,
      severity: "error",
    })),
  );

const githubToken = Config.option(Config.Redacted("GH_TOKEN")).pipe(
  Effect.map(Option.filter((token) => Redacted.value(token) !== "")),
  Effect.orDie,
);

const auditOptions = Effect.fn("fu4.auditOptions")(function* auditOptions(
  config: AuditConfig = {},
) {
  const { online = true, ...rest } = config;
  if (!online) {
    return rest;
  }
  const token = yield* githubToken;
  return {
    ...rest,
    ...present(token, (value) => ({ githubToken: Redacted.value(value) })),
  } satisfies NativeAuditOptions;
});

export const lint = Effect.fn("fu4.lint")(function* lint(input: LintInput) {
  const parent = yield* traceparent;
  const config = input.config ?? {};
  const options: NativeOptions = {
    config,
    audit: yield* auditOptions(config.audit),
    ...present(parent, (value) => ({ traceparent: value })),
  };
  const results = yield* callAddon({
    addon: native,
    name: "fu4",
    files: input.files.length,
    call: (addon) => addon.lintPaths(input.root, input.files, options),
    failWith: failedWith,
  });
  return sortByPosition(pipe(results, Arr.flatMap(diagnosticsOf)));
});

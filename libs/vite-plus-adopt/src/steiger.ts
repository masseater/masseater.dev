import { Effect, Path, Array as Arr, pipe } from "effect";
import { linter, processConfiguration } from "steiger";

import { attempt } from "./attempt.ts";
import type { VpToolsError } from "./errors.ts";
import type { Report } from "./report.ts";
import type { SteigerConfig } from "./types.ts";

interface Diagnostic {
  readonly severity: string;
  readonly message: string;
  readonly ruleName: string;
  readonly location: { readonly path: string };
}

const formatDiagnostic =
  (relative: (file: string) => string) =>
  (diagnostic: Diagnostic): string =>
    `${diagnostic.severity} ${relative(diagnostic.location.path)}: ${diagnostic.message} (${diagnostic.ruleName})`;

const reportOf = (
  diagnostics: readonly Diagnostic[],
  relative: (file: string) => string,
): Report => ({
  valid: pipe(
    diagnostics,
    Arr.every((diagnostic) => diagnostic.severity !== "error"),
  ),
  output: pipe(diagnostics, Arr.map(formatDiagnostic(relative)), Arr.join("\n")),
});

const checkSlices = (
  config: SteigerConfig,
  root: string,
  targets: readonly string[],
): Effect.Effect<Report, VpToolsError, Path.Path> =>
  Effect.gen(function* check() {
    const path = yield* Path.Path;
    processConfiguration([...config], root);
    const perTarget = yield* pipe(
      targets,
      Effect.forEach((target) => attempt("steiger")(() => linter.run(path.resolve(root, target)))),
    );
    return reportOf(Arr.flatten(perTarget), (file) => path.relative(root, file));
  });

export { checkSlices };

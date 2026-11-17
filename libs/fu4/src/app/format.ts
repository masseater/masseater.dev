import type { Diagnostic } from "#/shared/config/index.ts";

export const format = (diagnostic: Diagnostic): string =>
  `${diagnostic.path}:${String(diagnostic.line)}:${String(diagnostic.column)}: ${diagnostic.message} [${diagnostic.rule}]`;

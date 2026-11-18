import { Option, String as Str, pipe } from "effect";

import type { Finding } from "#/shared/config/index.ts";

const START = 0;
const SHORT_COMMIT = 12;

const commitOf = (finding: Finding): string =>
  pipe(
    Option.fromNullishOr(finding.commit),
    Option.map((commit) => ` (${Str.slice(START, SHORT_COMMIT)(commit)})`),
    Option.getOrElse(() => ""),
  );

export const format = (finding: Finding): string =>
  `${finding.path}:${String(finding.line)}:${String(finding.column)} ${finding.rule} ${finding.description} sha256:${finding.digest}${commitOf(finding)}`;

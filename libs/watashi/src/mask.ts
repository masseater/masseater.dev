import { Array as Arr, Effect, String as Str, pipe } from "effect";

import type { Detector } from "./betterleaks.ts";
import { WatashiFailed } from "./errors.ts";
import { joinLines, parseLines, redactedLine, scanView } from "./json-lines.ts";
import type { Line, View } from "./json-lines.ts";
import { applyTargets } from "./replace.ts";
import type { Target, Targets } from "./replace.ts";
import type { Finding } from "./report.ts";

type Masked = Readonly<{ text: string; redactions: number }>;

type Pass = Readonly<{ lines: readonly Line[]; redactions: number; done: boolean }>;

const MAX_PASSES = 3;
const NONE = 0;
const ONE = 1;

const encoder = new TextEncoder();

const isAscii = (text: string): boolean => encoder.encode(text).length === text.length;

const spanOf = (finding: Finding, viewLines: readonly string[]): string => {
  const lines = viewLines.slice(finding.startLine - ONE, finding.endLine);
  const [first = ""] = lines;
  if (lines.length === ONE && isAscii(first) && finding.endColumn >= finding.startColumn) {
    const span = Str.slice(finding.startColumn - ONE, finding.endColumn)(first);
    if (Str.isNonEmpty(span)) {
      return span;
    }
  }
  return Arr.join(lines, "\n");
};

const targetOf = (finding: Finding, view: string, viewLines: readonly string[]): string => {
  if (!finding.encoded && Str.isNonEmpty(finding.secret) && Str.includes(finding.secret)(view)) {
    return finding.secret;
  }
  return spanOf(finding, viewLines);
};

const targetsOf = (findings: readonly Finding[], view: string): Targets => {
  const viewLines = Str.split("\n")(view);
  return pipe(
    findings,
    Arr.map((finding): Target => [targetOf(finding, view, viewLines), finding.ruleId]),
    Arr.filter(([secret]) => Str.isNonEmpty(secret)),
    Arr.dedupeWith(([left], [right]) => left === right),
  );
};

const redactOwners = (
  lines: readonly Line[],
  findings: readonly Finding[],
  view: View,
): Effect.Effect<readonly Line[]> => {
  const owned = new Set(
    pipe(
      findings,
      Arr.flatMap((finding) => view.owners.slice(finding.startLine - ONE, finding.endLine)),
    ),
  );
  return pipe(
    lines,
    Effect.forEach((line, index) => {
      if (owned.has(index)) {
        return redactedLine(line);
      }
      return Effect.succeed(line);
    }),
  );
};

const afterFindings = (
  state: Pass,
  findings: readonly Finding[],
  view: View,
): Effect.Effect<Pass> =>
  applyTargets(targetsOf(findings, view.text))(state.lines).pipe(
    Effect.flatMap((applied) => {
      if (applied.count === NONE) {
        return redactOwners(state.lines, findings, view).pipe(
          Effect.map((lines) => ({
            lines,
            redactions: state.redactions + findings.length,
            done: false,
          })),
        );
      }
      return Effect.succeed({
        lines: applied.value,
        redactions: state.redactions + applied.count,
        done: false,
      });
    }),
  );

const pass =
  (detect: Detector) =>
  (state: Pass): Effect.Effect<Pass, WatashiFailed> => {
    const view = scanView(state.lines);
    return detect(view.text).pipe(
      Effect.flatMap((findings) => {
        if (findings.length === NONE) {
          return Effect.succeed({ ...state, done: true });
        }
        return afterFindings(state, findings, view);
      }),
    );
  };

const passes =
  (detect: Detector) =>
  (state: Pass, round: number): Effect.Effect<Pass, WatashiFailed> => {
    if (state.done || round >= MAX_PASSES) {
      return Effect.succeed(state);
    }
    return pass(detect)(state).pipe(Effect.flatMap((next) => passes(detect)(next, round + ONE)));
  };

const incomplete = WatashiFailed.make({
  reason: "Masking",
  message: "伏せても秘密が残ったので送らない",
});

const lastResort =
  (detect: Detector) =>
  (state: Pass): Effect.Effect<Masked, WatashiFailed> => {
    const view = scanView(state.lines);
    return detect(view.text).pipe(
      Effect.flatMap((remaining) => {
        if (remaining.length === NONE) {
          return Effect.succeed({ text: joinLines(state.lines), redactions: state.redactions });
        }
        return redactOwners(state.lines, remaining, view).pipe(
          Effect.flatMap((lines) =>
            detect(scanView(lines).text).pipe(
              Effect.filterOrFail(Arr.isReadonlyArrayEmpty, () => incomplete),
              Effect.as({
                text: joinLines(lines),
                redactions: state.redactions + remaining.length,
              }),
            ),
          ),
        );
      }),
    );
  };

const finish =
  (detect: Detector) =>
  (state: Pass): Effect.Effect<Masked, WatashiFailed> => {
    if (state.done) {
      return Effect.succeed({ text: joinLines(state.lines), redactions: state.redactions });
    }
    return lastResort(detect)(state);
  };

const maskWith =
  (detect: Detector) =>
  (text: string): Effect.Effect<Masked, WatashiFailed> =>
    passes(detect)({ lines: parseLines(text), redactions: NONE, done: false }, NONE).pipe(
      Effect.flatMap(finish(detect)),
    );

/** @internal */
export { maskWith };
/** @internal */
export type { Masked };

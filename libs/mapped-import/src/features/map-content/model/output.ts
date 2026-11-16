import { Array as Arr, Match, pipe } from "effect";
import { MappedCodeBuilder, stringIndexToPosition } from "ts-content-mapper";
import type { PositionEncoding, TransformResult } from "ts-content-mapper";

import type { Segment, Span } from "#/entities/segment/index.ts";

export type Request = Readonly<{
  fileName: string;
  content: string;
  positionEncoding: PositionEncoding;
}>;

export type Issue = Span & Readonly<{ message: string }>;

export type Mapped =
  | Readonly<{ status: "ok"; segments: readonly Segment[] }>
  | Readonly<{ status: "error"; fallback: string; issues: readonly Issue[] }>;

const PARSE_ERROR = 1;

const built = (
  { content, positionEncoding }: Request,
  segments: readonly Segment[],
): TransformResult => {
  const builder = new MappedCodeBuilder(content, { positionEncoding });
  for (const segment of segments) {
    Match.value(segment).pipe(
      Match.discriminatorsExhaustive("kind")({
        text: ({ text }) => builder.append(text),
        verbatim: ({ start, end }) => builder.appendVerbatim(start, end),
        alias: ({ text, start, end }) => builder.appendAlias(text, start, end),
        atom: ({ text, start, end }) => builder.appendAtom(text, start, end),
      }),
    );
  }
  return builder.build(".ts");
};

const failed = (
  { content, positionEncoding }: Request,
  fallback: string,
  issues: readonly Issue[],
): TransformResult => ({
  text: fallback,
  extension: ".ts",
  diagnostics: pipe(
    issues,
    Arr.map(({ message, start, end }) => {
      const from = stringIndexToPosition(content, start, positionEncoding);
      const to = stringIndexToPosition(content, end, positionEncoding);
      return { messageText: message, start: from, length: to - from, code: PARSE_ERROR };
    }),
  ),
});

export const mappedOutput = ({
  request,
  mapped,
}: Readonly<{ request: Request; mapped: Mapped }>): TransformResult =>
  Match.value(mapped).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ segments }) => built(request, segments),
      error: ({ fallback, issues }) => failed(request, fallback, issues),
    }),
  );

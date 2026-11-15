import { cutoffFor } from "@r_masseater/injection-bisect";
import type { Region } from "@r_masseater/injection-bisect";
import { Array as Arr, Option, Order, String as Str, pipe } from "effect";

import { answerOf } from "./answer";
import type { Focus } from "./draft";
import { traceOf } from "./trace";
import type { Answer, Phase, Row, Trace } from "./trace";

type Tone = "none" | "pending" | "miss" | "hit" | "injection";

interface Piece {
  readonly start: number;
  readonly text: string;
  readonly tone: Tone;
  readonly answer: boolean;
}

interface Span {
  readonly start: number;
  readonly end: number;
}

const FIRST = 0;

const NEXT = 1;

const LAST = -1;

const byDepth = Order.mapInput(Order.Number, (row: Row) => row.depth);

const toneOf = (answer: Answer): Tone => {
  if (answer.status === "pending") {
    return "pending";
  }
  if (answer.probability >= cutoffFor(answer.model)) {
    return "hit";
  }
  return "miss";
};

const covers = (span: Span, at: number): boolean => span.start <= at && at < span.end;

const regionsOf = (phase: Phase): readonly Region[] => {
  if (phase.status === "done" && phase.detection.status === "injected") {
    return phase.detection.regions;
  }
  return [];
};

const deepestAt = (rows: readonly Row[], at: number): Option.Option<Row> => {
  const covering = pipe(
    rows,
    Arr.filter((row) => covers(row, at)),
  );
  return Arr.last(Arr.sort(covering, byDepth));
};

const rowTone = (rows: readonly Row[], at: number): Tone =>
  Option.match(deepestAt(rows, at), {
    onNone: (): Tone => "none",
    onSome: (row) => toneOf(row.answer),
  });

const visibleRows = (trace: Trace, focus: Focus): readonly Row[] => {
  if (focus.status === "probe") {
    return pipe(
      trace.rows,
      Arr.filter((row) => row.id === focus.id),
    );
  }
  return trace.rows;
};

const toneAt = (trace: Trace, focus: Focus, at: number): Tone => {
  if (
    focus.status === "none" &&
    pipe(
      regionsOf(trace.phase),
      Arr.some((region) => covers(region, at)),
    )
  ) {
    return "injection";
  }
  return rowTone(visibleRows(trace, focus), at);
};

const NOT_RUN = traceOf([]);

const piecesOf = ({
  text,
  run,
  focus,
}: Readonly<{
  text: string;
  run: Option.Option<Trace>;
  focus: Focus;
}>): readonly Piece[] => {
  const trace = Option.getOrElse(run, () => NOT_RUN);
  const answer = answerOf(text);
  const cuts = new Set([FIRST, text.length]);
  for (const span of [...trace.rows, ...regionsOf(trace.phase), ...answer]) {
    cuts.add(span.start);
    cuts.add(span.end);
  }
  const sorted = Arr.sort(cuts, Order.Number);
  return pipe(
    sorted.slice(FIRST, LAST),
    Arr.map((start, index) => ({
      start,
      text: Str.slice(start, sorted[index + NEXT])(text),
      tone: toneAt(trace, focus, start),
      answer: pipe(
        answer,
        Arr.some((span) => covers(span, start)),
      ),
    })),
  );
};

export type { Piece, Tone };
export { piecesOf, toneOf };

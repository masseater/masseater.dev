import { StateEffect, StateField } from "@codemirror/state";
import type { EditorState, Range } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { Remark } from "@masseater.dev/yohaku-protocol";
import type { Classified, ParagraphKind } from "@masseater.dev/yohaku-protocol";
import { Array, Option, Record, Schema, pipe } from "effect";

import { FIRST_LINE, lineOf, paragraphIdsField } from "./paragraph-ids.ts";

type Kind = typeof ParagraphKind.Type;
type Texts = Readonly<Record<string, string>>;
type RemarkType = typeof Remark.Type;

interface Annotated {
  readonly kinds: Readonly<Record<string, Kind>>;
  readonly remarks: DecorationSet;
}

interface Received {
  readonly kinds: readonly (typeof Classified.Type)[];
  readonly remarks: readonly RemarkType[];
  readonly texts: Texts;
}

interface Marked {
  readonly key: string;
  readonly paragraphId: string;
  readonly rule: string;
  readonly message: string;
  readonly from: number;
  readonly to: number;
}

const PROSE: Kind = "prose";

const RemarkSpec = Schema.Struct({ key: Schema.String, remark: Remark });
const specOf = Schema.decodeUnknownOption(RemarkSpec);

const received = StateEffect.define<Received>();
const dropped = StateEffect.define<string>();

const keyOf = ({ paragraphId, rule, from }: RemarkType): string =>
  `${paragraphId}:${rule}:${globalThis.String(from)}`;

const specIn = (decoration: Decoration): Option.Option<typeof RemarkSpec.Type> => {
  const spec: unknown = decoration.spec;
  return specOf(spec);
};

const rangeOf =
  (state: EditorState, texts: Texts) =>
  (remark: RemarkType): Option.Option<Range<Decoration>> =>
    pipe(
      lineOf(remark.paragraphId)(state),
      Option.map((number) => state.doc.line(number)),
      Option.filter((line) => Option.contains(Record.get(texts, remark.paragraphId), line.text)),
      Option.map((line) =>
        Decoration.mark({ class: "yohaku-remark", key: keyOf(remark), remark }).range(
          line.from + remark.from,
          line.from + remark.to,
        ),
      ),
    );

const remarkSet = (state: EditorState, { remarks, texts }: Received): DecorationSet => {
  const ranges = pipe(remarks, Array.map(rangeOf(state, texts)), Array.getSomes);
  return Decoration.set(ranges, true);
};

const annotatedFrom = (state: EditorState, value: Received): Annotated => ({
  kinds: pipe(
    value.kinds,
    Array.map(({ paragraphId, kind }) => [paragraphId, kind] as const),
    Record.fromEntries,
  ),
  remarks: remarkSet(state, value),
});

const keptUnless =
  (key: string) =>
  (_from: number, _to: number, decoration: Decoration): boolean =>
    !pipe(
      specIn(decoration),
      Option.exists((spec) => spec.key === key),
    );

const annotationsField = StateField.define<Annotated>({
  create: () => ({ kinds: Record.empty(), remarks: Decoration.none }),
  update: (value, transaction) => {
    let annotated: Annotated = { ...value, remarks: value.remarks.map(transaction.changes) };
    for (const effect of transaction.effects) {
      if (effect.is(received)) {
        annotated = annotatedFrom(transaction.state, effect.value);
      }
      if (effect.is(dropped)) {
        annotated = {
          ...annotated,
          remarks: annotated.remarks.update({ filter: keptUnless(effect.value) }),
        };
      }
    }
    return annotated;
  },
  provide: (field) => EditorView.decorations.from(field, ({ remarks }) => remarks),
});

const kindAt =
  (lineNumber: number) =>
  (state: EditorState): Kind =>
    pipe(
      Array.get(state.field(paragraphIdsField), lineNumber - FIRST_LINE),
      Option.flatMap((id) => Record.get(state.field(annotationsField).kinds, id)),
      Option.getOrElse(() => PROSE),
    );

const noteLine = Decoration.line({ class: "yohaku-note" });

const noteLines = EditorView.decorations.compute([annotationsField, paragraphIdsField], (state) =>
  Decoration.set(
    pipe(
      Array.makeBy(state.doc.lines, (index) => index + FIRST_LINE),
      Array.filter((number) => kindAt(number)(state) !== PROSE),
      Array.map((number) => noteLine.range(state.doc.line(number).from)),
    ),
  ),
);

const markedFrom = (remark: RemarkType, from: number, to: number): Marked => ({
  key: keyOf(remark),
  paragraphId: remark.paragraphId,
  rule: remark.rule,
  message: remark.message,
  from,
  to,
});

const markedAt = ([decoration, from, to]: readonly [
  Decoration,
  number,
  number,
]): Option.Option<Marked> =>
  pipe(
    specIn(decoration),
    Option.map(({ remark }) => markedFrom(remark, from, to)),
  );

const remarksIn = (state: EditorState): readonly Marked[] => {
  const spans: (readonly [Decoration, number, number])[] = [];
  const cursor = state.field(annotationsField).remarks.iter();
  let current = Option.fromNullishOr(cursor.value);
  while (Option.isSome(current)) {
    spans.push([current.value, cursor.from, cursor.to]);
    cursor.next();
    current = Option.fromNullishOr(cursor.value);
  }
  return pipe(spans, Array.map(markedAt), Array.getSomes);
};

export { annotationsField, dropped, kindAt, noteLines, received, remarksIn };
export type { Kind, Marked, Received, Texts };

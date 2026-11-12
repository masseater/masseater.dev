import { StateEffect, StateField } from "@codemirror/state";
import type { EditorState, Range } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import type { Classified, ParagraphKind, Remark } from "@masseater.dev/yohaku-protocol";
import { Array, HashMap, Option, pipe } from "effect";

import { FIRST_LINE, lineOf, paragraphIdsField } from "./paragraph-ids.ts";

type Kind = typeof ParagraphKind.Type;

interface Annotated {
  readonly kinds: HashMap.HashMap<string, Kind>;
  readonly remarks: DecorationSet;
}

interface Received {
  readonly kinds: readonly (typeof Classified.Type)[];
  readonly remarks: readonly (typeof Remark.Type)[];
  readonly texts: HashMap.HashMap<string, string>;
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

const received = StateEffect.define<Received>();
const dropped = StateEffect.define<string>();

const keyOf = ({ paragraphId, rule, from }: typeof Remark.Type): string =>
  `${paragraphId}:${rule}:${globalThis.String(from)}`;

const rangeOf =
  (state: EditorState, texts: HashMap.HashMap<string, string>) =>
  (remark: typeof Remark.Type): Option.Option<Range<Decoration>> =>
    pipe(
      lineOf(state, remark.paragraphId),
      Option.map((number) => state.doc.line(number)),
      Option.filter((line) => Option.contains(HashMap.get(texts, remark.paragraphId), line.text)),
      Option.map((line) =>
        Decoration.mark({
          class: "yohaku-remark",
          key: keyOf(remark),
          remark,
        }).range(line.from + remark.from, line.from + remark.to),
      ),
    );

const annotatedFrom = (state: EditorState, { kinds, remarks, texts }: Received): Annotated => ({
  kinds: pipe(
    kinds,
    Array.map(({ paragraphId, kind }) => [paragraphId, kind] as const),
    HashMap.fromIterable,
  ),
  remarks: Decoration.set(pipe(remarks, Array.map(rangeOf(state, texts)), Array.getSomes), true),
});

const withoutRemark = (annotated: Annotated, key: string): Annotated => ({
  ...annotated,
  remarks: annotated.remarks.update({
    filter: (_from, _to, decoration) => decoration.spec["key"] !== key,
  }),
});

const annotationsField = StateField.define<Annotated>({
  create: () => ({ kinds: HashMap.empty(), remarks: Decoration.none }),
  update: (value, transaction) =>
    pipe(
      transaction.effects,
      Array.reduce(
        { ...value, remarks: value.remarks.map(transaction.changes) },
        (annotated, effect) => {
          if (effect.is(received)) {
            return annotatedFrom(transaction.state, effect.value);
          }
          if (effect.is(dropped)) {
            return withoutRemark(annotated, effect.value);
          }
          return annotated;
        },
      ),
    ),
  provide: (field) => EditorView.decorations.from(field, ({ remarks }) => remarks),
});

const kindAt = (state: EditorState, lineNumber: number): Kind =>
  pipe(
    Array.get(state.field(paragraphIdsField), lineNumber - FIRST_LINE),
    Option.flatMap((id) => HashMap.get(state.field(annotationsField).kinds, id)),
    Option.getOrElse(() => PROSE),
  );

const noteLines = EditorView.decorations.compute([annotationsField, paragraphIdsField], (state) =>
  Decoration.set(
    pipe(
      Array.makeBy(state.doc.lines, (index) => index + FIRST_LINE),
      Array.filter((number) => kindAt(state, number) !== PROSE),
      Array.map((number) => Decoration.line({ class: "yohaku-note" }).range(state.doc.line(number).from)),
    ),
  ),
);

const remarksIn = (state: EditorState): readonly Marked[] =>
  Array.unfold(state.field(annotationsField).remarks.iter(), (cursor) =>
    pipe(
      Option.fromNullishOr(cursor.value),
      Option.map((decoration) => {
        const remark: typeof Remark.Type = decoration.spec["remark"];
        const marked: Marked = {
          key: keyOf(remark),
          paragraphId: remark.paragraphId,
          rule: remark.rule,
          message: remark.message,
          from: cursor.from,
          to: cursor.to,
        };
        cursor.next();
        return [marked, cursor] as const;
      }),
    ),
  );

export { annotationsField, dropped, kindAt, noteLines, received, remarksIn };
export type { Kind, Marked, Received };

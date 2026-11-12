import { Facet, MapMode, StateField } from "@codemirror/state";
import type { ChangeDesc, EditorState, Text, Transaction } from "@codemirror/state";
import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import { Array, HashMap, Option, pipe } from "effect";

const LINE_BREAK = "\n";
const FIRST_LINE = 1;
const BEFORE = -1;
const NO_IDS: readonly string[] = [];

const freshId = (): string => globalThis.crypto.randomUUID();

const initialIds = Facet.define<readonly string[], readonly string[]>({
  combine: (values) => pipe(Array.head(values), Option.getOrElse(() => NO_IDS)),
});

const carriedLine =
  (before: Text, after: Text, changes: ChangeDesc) =>
  (id: string, index: number): Option.Option<readonly [number, string]> => {
    const start = before.line(index + FIRST_LINE).from;
    return pipe(
      Option.fromNullishOr(changes.mapPos(start, BEFORE, MapMode.TrackDel)),
      Option.map((mapped) => ({ mapped, line: after.lineAt(mapped) })),
      Option.filter(({ mapped, line }) => line.from === mapped),
      Option.map(({ line }) => [line.number, id] as const),
    );
  };

const remapped = (ids: readonly string[], transaction: Transaction): readonly string[] => {
  const after = transaction.state.doc;
  const carried = pipe(
    ids,
    Array.map(carriedLine(transaction.startState.doc, after, transaction.changes)),
    Array.getSomes,
    Array.reverse,
    HashMap.fromIterable,
  );
  return Array.makeBy(after.lines, (index) =>
    pipe(HashMap.get(carried, index + FIRST_LINE), Option.getOrElse(freshId)),
  );
};

const paragraphIdsField = StateField.define<readonly string[]>({
  create: (state) =>
    Array.makeBy(state.doc.lines, (index) =>
      pipe(Array.get(state.facet(initialIds), index), Option.getOrElse(freshId)),
    ),
  update: (ids, transaction) => (transaction.docChanged ? remapped(ids, transaction) : ids),
});

const textOf = (paragraphs: readonly (typeof Paragraph.Type)[]): string =>
  pipe(
    paragraphs,
    Array.map(({ text }) => text),
    Array.join(LINE_BREAK),
  );

const paragraphsOf = (state: EditorState): readonly (typeof Paragraph.Type)[] =>
  pipe(
    state.field(paragraphIdsField),
    Array.map((id, index) => ({ id, text: state.doc.line(index + FIRST_LINE).text })),
  );

const lineOf = (state: EditorState, paragraphId: string): Option.Option<number> =>
  pipe(
    state.field(paragraphIdsField),
    Array.findFirstIndex((id) => id === paragraphId),
    Option.map((index) => index + FIRST_LINE),
  );

export { FIRST_LINE, initialIds, lineOf, paragraphIdsField, paragraphsOf, textOf };

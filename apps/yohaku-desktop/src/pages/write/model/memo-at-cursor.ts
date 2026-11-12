import type { EditorState } from "@codemirror/state";
import { Array, Option, pipe } from "effect";

import { kindAt } from "./annotations.ts";
import { draftOf } from "./memo-draft.ts";
import { FIRST_LINE, paragraphIdsField } from "./paragraph-ids.ts";

const MEMO = "memo";

const memoAtCursor = (state: EditorState): Option.Option<string> => {
  const line = state.doc.lineAt(state.selection.main.head).number;
  return pipe(
    Array.get(state.field(paragraphIdsField), line - FIRST_LINE),
    Option.filter(() => kindAt(state, line) === MEMO),
    Option.filter((paragraphId) => Option.isNone(draftOf(state, paragraphId))),
  );
};

export { memoAtCursor };

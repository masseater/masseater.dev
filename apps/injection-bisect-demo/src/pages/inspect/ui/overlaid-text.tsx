import { cn } from "@masseater.dev/web-ui";
import { Array as Arr, Option, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import {
  useDraftText,
  useFocus,
  useSetDraftText,
  MAX_CHARS,
  piecesOf,
} from "#/entities/inspection";
import type { Focus, Piece } from "#/entities/inspection";
import type { InspectState } from "#/features/run-inspection";

import { HighlightTextarea } from "./highlight-textarea";
import { ANSWER_CLASS, TONE_CLASS } from "./tone";

const overlayOf = (text: string, state: InspectState, focus: Focus): readonly Piece[] => {
  if (state.status !== "streaming" || state.text !== text) {
    return piecesOf({ text, run: Option.none(), focus });
  }
  return piecesOf({ text, run: Option.some(state.trace), focus });
};

const OverlaidText = ({ state }: Readonly<{ state: InspectState }>): ReactNode => {
  const text = useDraftText();
  const setText = useSetDraftText();
  const focus = useFocus();
  const edit = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    [setText],
  );
  return (
    <HighlightTextarea maxLength={MAX_CHARS} value={text} onChange={edit}>
      {pipe(
        overlayOf(text, state, focus),
        Arr.map((piece) => (
          <span
            key={piece.start}
            className={cn(TONE_CLASS[piece.tone], piece.answer && ANSWER_CLASS)}
          >
            {piece.text}
          </span>
        )),
      )}
    </HighlightTextarea>
  );
};

export { OverlaidText };

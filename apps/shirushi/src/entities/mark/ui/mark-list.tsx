import type { Mark } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { MarkLabel } from "./mark-label.tsx";
import { MarkRow } from "./mark-row.tsx";

export const MarkList = ({
  marks,
  showSong,
  onPick,
  onRemove,
}: Readonly<{
  marks: readonly Mark[];
  showSong: boolean;
  onPick: (mark: Mark) => void;
  onRemove: (id: string) => void;
}>): ReactNode => (
  <ul className="grid">
    {pipe(
      marks,
      Arr.map((mark) => (
        <MarkRow key={mark.id} mark={mark} onPick={onPick} onRemove={onRemove}>
          <MarkLabel mark={mark} showSong={showSong} />
        </MarkRow>
      )),
    )}
  </ul>
);

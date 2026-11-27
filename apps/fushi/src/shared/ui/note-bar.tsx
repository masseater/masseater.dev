import type { ReactNode } from "react";

import type { SnippetNote } from "#/shared/lib/index.ts";

import { HEIGHT, NOTE, WIDTH } from "./frame.ts";
import type { Frame } from "./frame.ts";

const GAP = 0.4;

export const NoteBar = ({
  note,
  frame,
}: Readonly<{ note: SnippetNote; frame: Frame }>): ReactNode => (
  <rect
    x={(note.start / frame.end) * WIDTH}
    y={((frame.low + frame.span - note.midi) / frame.span) * (HEIGHT - NOTE)}
    width={Math.max(GAP, (note.length / frame.end) * WIDTH - GAP)}
    height={NOTE}
    className="fill-muted-foreground"
  />
);

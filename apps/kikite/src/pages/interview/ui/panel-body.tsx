import type { ReactNode } from "react";

import { usePanel } from "#/entities/interview";

import { NoteSection } from "./note-section.tsx";
import { OPEN, POINTS } from "./notes.ts";
import { Transcript } from "./transcript.tsx";

const PanelBody = (): ReactNode => {
  const panel = usePanel();
  if (panel === "transcript") {
    return <Transcript />;
  }
  if (panel === "open") {
    return <NoteSection note={OPEN} className="min-h-0 flex-1 overflow-y-auto px-0" />;
  }
  return <NoteSection note={POINTS} className="min-h-0 flex-1 overflow-y-auto px-0" />;
};

export { PanelBody };

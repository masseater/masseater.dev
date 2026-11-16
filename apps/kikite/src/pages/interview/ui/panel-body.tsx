import type { ReactNode } from "react";

import { usePanel } from "#/entities/interview/index.ts";
import { LeadSection } from "#/features/research-leads/index.ts";

import { NoteSection } from "./note-section.tsx";
import { OPEN, POINTS } from "./notes.ts";
import { Transcript } from "./transcript.tsx";

export const PanelBody = (): ReactNode => {
  const panel = usePanel();
  if (panel === "transcript") {
    return <Transcript />;
  }
  if (panel === "leads") {
    return <LeadSection className="min-h-0 flex-1 overflow-y-auto px-0" />;
  }
  if (panel === "open") {
    return <NoteSection note={OPEN} className="min-h-0 flex-1 overflow-y-auto px-0" />;
  }
  return <NoteSection note={POINTS} className="min-h-0 flex-1 overflow-y-auto px-0" />;
};

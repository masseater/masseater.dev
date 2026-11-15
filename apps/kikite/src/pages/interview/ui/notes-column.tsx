import type { ReactNode } from "react";

import { LeadSection } from "#/features/research-leads";

import { NoteSection } from "./note-section.tsx";
import { OPEN, POINTS } from "./notes.ts";

export const NotesColumn = (): ReactNode => (
  <aside className="hidden w-80 shrink-0 flex-col border-r lg:flex">
    <NoteSection note={POINTS} className="min-h-0 flex-1 overflow-y-auto" />
    <NoteSection note={OPEN} className="max-h-1/3 shrink-0 overflow-y-auto border-t" />
    <LeadSection className="max-h-1/3 shrink-0 overflow-y-auto border-t" />
  </aside>
);

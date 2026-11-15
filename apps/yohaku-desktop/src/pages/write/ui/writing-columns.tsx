import type { ReactNode } from "react";

import { EditorSurface } from "./editor-surface.tsx";
import { MarginNotes } from "./margin-notes.tsx";

export const WritingColumns = (): ReactNode => (
  <div className="mx-auto flex w-fit gap-x-8">
    <EditorSurface />
    <MarginNotes />
  </div>
);

import type { ReactNode } from "react";

import { EditorSurface } from "#/features/edit-draft/index.ts";

import { MarginNotes } from "./margin-notes.tsx";

export const WritingColumns = (): ReactNode => (
  <div className="mx-auto flex w-fit gap-x-8">
    <EditorSurface />
    <MarginNotes />
  </div>
);

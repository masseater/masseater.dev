import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import type { ReactNode } from "react";

import { EditorSurface } from "./editor-surface.tsx";
import { MarginNotes } from "./margin-notes.tsx";

const WritingColumns = ({
  initial,
}: Readonly<{ initial: readonly (typeof Paragraph.Type)[] }>): ReactNode => (
  <div className="mx-auto flex w-fit gap-x-8">
    <EditorSurface initial={initial} />
    <MarginNotes />
  </div>
);

export { WritingColumns };

import { cn } from "@masseater.dev/ui/cn";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useSummary } from "#/pages/interview/model/hooks";

import { NoteList } from "./note-list.tsx";
import type { Note } from "./notes.ts";

const NoteSection = ({
  note,
  className,
}: Readonly<{ note: Note; className?: string }>): ReactNode => {
  const items = pipe(
    useSummary(),
    Option.match({ onNone: Arr.empty<string>, onSome: (summary) => summary[note.key] }),
  );
  return (
    <section className={cn("flex flex-col gap-3 px-5 py-4", className)}>
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wider max-lg:sr-only">
        {note.label}
      </h2>
      <NoteList items={items} empty={note.empty} />
    </section>
  );
};

export { NoteSection };

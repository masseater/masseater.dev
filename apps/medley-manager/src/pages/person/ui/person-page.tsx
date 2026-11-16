import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { usePerson } from "#/pages/person/api/use-person.ts";
import { SectionHeading } from "#/shared/ui/section-heading.tsx";

import { CreditsTable } from "./credits-table.tsx";

const KICKER = "✎ 担当者";

export const PersonPage = (): ReactNode => {
  const person = usePerson();
  return (
    <div className="flex flex-col gap-10">
      <header className="bg-screen flex flex-col items-start gap-3 rounded-xl border p-6">
        <span className="text-comment-pink text-sm font-bold">{KICKER}</span>
        <h1 className="font-display text-3xl sm:text-4xl">{person.name}</h1>
        {Arr.isReadonlyArrayNonEmpty(person.aliases) && (
          <p className="text-muted-foreground text-sm">{`別名義: ${pipe(person.aliases, Arr.join("、"))}`}</p>
        )}
      </header>
      <section className="flex flex-col gap-4">
        <SectionHeading title="担当したパート" count={person.credits.length} />
        <CreditsTable />
      </section>
    </div>
  );
};

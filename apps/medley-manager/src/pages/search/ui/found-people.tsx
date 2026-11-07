import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useSearchResults } from "#/pages/search/api/use-search-results";
import { SectionHeading } from "#/shared/ui/section-heading";

import { PersonPill } from "./person-pill";

const FoundPeople = (): ReactNode => {
  const { people } = useSearchResults();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="担当者" count={people.length} />
      <ul className="flex flex-wrap gap-2">
        {pipe(
          people,
          Array.map((person) => <PersonPill key={person.id} person={person} />),
        )}
      </ul>
    </section>
  );
};

export { FoundPeople };

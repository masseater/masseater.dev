import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { PersonValue } from "#/entities/watashi/index.ts";
import { RowList, Section } from "#/shared/ui/index.ts";

import { PersonRow } from "./person-row";

const TITLE = "よく会う人";

export const PeopleSection = ({
  people,
}: Readonly<{ people: readonly PersonValue[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(people) && (
    <Section title={TITLE}>
      <RowList label={TITLE}>
        {pipe(
          people,
          Arr.map((person) => <PersonRow key={person.name} person={person} />),
        )}
      </RowList>
    </Section>
  );

import type { ReactNode } from "react";

import { PersonLink } from "#/entities/person/index.ts";
import { PillItem } from "#/shared/ui/pill-item.tsx";

export const PersonPill = ({
  person,
}: Readonly<{ person: Readonly<{ id: number; name: string }> }>): ReactNode => (
  <PillItem>
    <PersonLink id={person.id} name={person.name} />
  </PillItem>
);

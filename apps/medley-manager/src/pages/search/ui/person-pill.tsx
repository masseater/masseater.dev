import type { ReactNode } from "react";

import { PersonLink } from "#/entities/person";
import { PillItem } from "#/shared/ui/pill-item";

const PersonPill = ({
  person,
}: Readonly<{ person: Readonly<{ id: number; name: string }> }>): ReactNode => (
  <PillItem>
    <PersonLink id={person.id} name={person.name} />
  </PillItem>
);

export { PersonPill };

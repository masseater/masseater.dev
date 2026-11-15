import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { headline } from "#/entities/watashi/index.ts";
import type { PersonValue } from "#/entities/watashi/index.ts";
import { Row } from "#/shared/ui/index.ts";

const TIMES = "回";

export const PersonRow = ({ person }: Readonly<{ person: PersonValue }>): ReactNode => (
  <Row lead={person.lastMet ?? ""}>
    <p className="text-std-17B-170">{person.name}</p>
    <p className="text-muted-foreground text-xs tabular-nums">{`${String(person.count)}${TIMES}`}</p>
    {pipe(
      person.facts,
      Arr.map((fact) => (
        <p className="text-muted-foreground text-sm" key={fact.ref}>
          {headline(fact)}
        </p>
      )),
    )}
  </Row>
);

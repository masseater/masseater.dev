import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { headline } from "#/entities/watashi";
import type { PersonValue } from "#/entities/watashi";
import { Row } from "#/shared/ui";

const TIMES = "回";

const PersonRow = ({ person }: Readonly<{ person: PersonValue }>): ReactNode => (
  <Row lead={person.lastMet ?? ""}>
    <p className="font-display text-lg font-light">{person.name}</p>
    <p className="text-foreground/50 text-xs tabular-nums">{`${String(person.count)}${TIMES}`}</p>
    {pipe(
      person.facts,
      Arr.map((fact) => (
        <p className="text-foreground/70 text-sm" key={fact.ref}>
          {headline(fact)}
        </p>
      )),
    )}
  </Row>
);

export { PersonRow };

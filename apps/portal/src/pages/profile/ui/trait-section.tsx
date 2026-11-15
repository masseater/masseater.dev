import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { traitLabel } from "#/entities/watashi";
import type { TraitValue } from "#/entities/watashi";
import { RowList, Section } from "#/shared/ui";

import { TraitRow } from "./trait-row";

export const TraitSection = ({
  kind,
  traits,
}: Readonly<{ kind: string; traits: readonly TraitValue[] }>): ReactNode => (
  <Section title={traitLabel(kind)}>
    <RowList label={traitLabel(kind)}>
      {pipe(
        traits,
        Arr.map((trait) => <TraitRow key={trait.ref} trait={trait} />),
      )}
    </RowList>
  </Section>
);

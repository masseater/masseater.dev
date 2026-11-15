import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { traitLabel } from "#/entities/watashi/index.ts";
import type { TraitValue } from "#/entities/watashi/index.ts";
import { RowList, Section } from "#/shared/ui/index.ts";

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

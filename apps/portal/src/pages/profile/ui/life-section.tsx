import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { LifeList } from "#/entities/watashi";
import type { LifeItemValue } from "#/entities/watashi";
import { Section } from "#/shared/ui";

const LifeSection = ({
  items,
  title,
}: Readonly<{ items: readonly LifeItemValue[]; title: string }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(items) && (
    <Section title={title}>
      <LifeList items={items} label={title} />
    </Section>
  );

export { LifeSection };

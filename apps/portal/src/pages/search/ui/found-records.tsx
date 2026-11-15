import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { LifeList } from "#/entities/watashi";
import { useFoundRecords } from "#/pages/search/api/search-query";
import { Section } from "#/shared/ui";

const TITLE = "ライフ記録";

export const FoundRecords = ({ keyword }: Readonly<{ keyword: string }>): ReactNode => {
  const items = useFoundRecords(keyword);
  return (
    <Section meta={`${String(Arr.length(items))} 件`} title={TITLE}>
      <LifeList items={items} label={TITLE} />
    </Section>
  );
};

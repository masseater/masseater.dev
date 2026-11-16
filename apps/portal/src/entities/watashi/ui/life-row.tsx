import { Option, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { headline, labelsOf, recordLabel } from "#/entities/watashi/model/life-item.ts";
import type { LifeItemValue } from "#/entities/watashi/model/life-item.ts";
import { shownTime } from "#/shared/model/index.ts";
import { Row, TagList } from "#/shared/ui/index.ts";

const timeOf = (item: LifeItemValue): string =>
  pipe(
    Option.fromUndefinedOr(item.at ?? item.since ?? item.due),
    Option.match({ onNone: () => recordLabel(item.ref), onSome: shownTime }),
  );

export const LifeRow = ({ item }: Readonly<{ item: LifeItemValue }>): ReactNode => {
  const tags = useMemo(() => [recordLabel(item.ref), ...labelsOf(item)], [item]);
  return (
    <Row lead={timeOf(item)}>
      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
        {headline(item)}
      </p>
      <TagList tags={tags} />
    </Row>
  );
};

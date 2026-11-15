import { Option, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { headline, labelsOf, recordLabel } from "#/entities/watashi/model/life-item";
import type { LifeItemValue } from "#/entities/watashi/model/life-item";
import { shownTime } from "#/shared/model";
import { Row, TagList } from "#/shared/ui";

const timeOf = (item: LifeItemValue): string =>
  pipe(
    Option.fromUndefinedOr(item.at ?? item.since ?? item.due),
    Option.match({ onNone: () => recordLabel(item.ref), onSome: shownTime }),
  );

const LifeRow = ({ item }: Readonly<{ item: LifeItemValue }>): ReactNode => {
  const tags = useMemo(() => [recordLabel(item.ref), ...labelsOf(item)], [item]);
  return (
    <Row lead={timeOf(item)}>
      <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
        {headline(item)}
      </p>
      <TagList tags={tags} />
    </Row>
  );
};

export { LifeRow };

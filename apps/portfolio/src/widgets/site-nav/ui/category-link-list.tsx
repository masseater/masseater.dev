import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { categoryInfos } from "#/entities/entry";
import type { Direction } from "#/widgets/site-nav/model/direction";

import { CategoryLink } from "./category-link";
import { LinkList } from "./link-list";

const LABEL = "カテゴリ";

const CategoryLinkList = ({ direction }: Readonly<{ direction: Direction }>): ReactNode => (
  <nav aria-label={LABEL}>
    <LinkList direction={direction}>
      {pipe(
        categoryInfos,
        Arr.map((info) => <CategoryLink info={info} key={info.category} />),
      )}
    </LinkList>
  </nav>
);

export { CategoryLinkList };

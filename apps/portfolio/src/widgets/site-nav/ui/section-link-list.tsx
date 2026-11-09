import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { sections } from "#/shared/config";
import type { Direction } from "#/widgets/site-nav/model/direction";

import { LinkList } from "./link-list";
import { SectionLink } from "./section-link";

const LABEL = "セクション";

const SectionLinkList = ({ direction }: Readonly<{ direction: Direction }>): ReactNode => (
  <nav aria-label={LABEL}>
    <LinkList direction={direction}>
      {pipe(
        sections,
        Arr.map((section) => <SectionLink direction={direction} key={section} section={section} />),
      )}
    </LinkList>
  </nav>
);

export { SectionLinkList };

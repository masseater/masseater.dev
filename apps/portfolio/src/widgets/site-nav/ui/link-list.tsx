import type { ReactNode } from "react";

import type { Direction } from "#/widgets/site-nav/model/direction";

const LIST_CLASS = {
  row: "flex flex-wrap justify-center gap-x-4",
  compact: "flex justify-end sm:gap-x-4",
} as const;

const LinkList = ({
  children,
  direction,
}: Readonly<{ children: ReactNode; direction: Direction }>): ReactNode => (
  <ul className={LIST_CLASS[direction]}>{children}</ul>
);

export { LinkList };

import type { ReactNode } from "react";

import type { Direction } from "#/widgets/site-nav/model/direction.ts";

const LIST_CLASS = {
  row: "flex flex-wrap justify-center gap-x-4",
  header: "flex justify-end sm:justify-center sm:gap-x-4",
} as const;

export const LinkList = ({
  children,
  direction,
}: Readonly<{ children: ReactNode; direction: Direction }>): ReactNode => (
  <ul className={LIST_CLASS[direction]}>{children}</ul>
);

import type { ReactNode } from "react";

import { pageLabel } from "#/pages/ranking/model/format";
import { TEXT } from "#/pages/ranking/model/labels";

import { PagerLink } from "./pager-link";

const STEP = 1;
const FIRST_PAGE = 1;

const Pager = ({ page, pages }: Readonly<{ page: number; pages: number }>): ReactNode => (
  <nav className="flex items-center justify-center gap-4 text-sm tabular-nums">
    <PagerLink page={page - STEP} enabled={page > FIRST_PAGE} text={TEXT.previous} />
    <span>{pageLabel({ page, pages })}</span>
    <PagerLink page={page + STEP} enabled={page < pages} text={TEXT.next} />
  </nav>
);

export { Pager };

import { Link } from "@tanstack/react-router";
import { pipe, Record } from "effect";
import type { ReactNode } from "react";

import { sectionMeta } from "#/shared/config";
import type { Section } from "#/shared/config";
import type { Direction } from "#/widgets/site-nav/model/direction";

import { NavLabel } from "./nav-label";

const LINK_CLASS = {
  row: "px-2 py-3",
  header: "px-1 py-3 max-sm:text-[0.6875rem] max-sm:tracking-normal sm:px-2",
} as const;

const ACTIVE_PROPS = { className: "text-foreground" } as const;

const PARAMS = pipe(
  sectionMeta,
  Record.map((_meta, category) => ({ category })),
);

export const SectionLink = ({
  direction,
  section,
}: Readonly<{ direction: Direction; section: Section }>): ReactNode => (
  <li>
    <Link
      activeProps={ACTIVE_PROPS}
      className={`stage-link ${LINK_CLASS[direction]}`}
      params={PARAMS[section]}
      to="/$category"
    >
      {({ isActive }) => <NavLabel active={isActive} section={section} />}
    </Link>
  </li>
);

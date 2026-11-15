import { Link } from "@tanstack/react-router";
import type { Option } from "effect";
import { Record as Rec, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

const PILL =
  "ring-foreground/10 text-foreground/60 hover:text-foreground aria-[current=page]:ring-foreground/60 aria-[current=page]:text-foreground inline-block rounded-full px-3 py-1 ring-1 transition-colors";

export const TagItem = ({
  active,
  label,
  tag,
}: Readonly<{ active: boolean; label: string; tag: Option.Option<string> }>): ReactNode => {
  const search = useMemo(() => pipe({ tag }, Rec.getSomes), [tag]);
  return (
    <li>
      <Link aria-current={active && "page"} className={PILL} search={search} to="/slides">
        {label}
      </Link>
    </li>
  );
};

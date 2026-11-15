import { Link } from "@tanstack/react-router";
import type { Option } from "effect";
import { Record as Rec, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

const PILL =
  "border-line-strong hover:bg-muted aria-[current=page]:bg-primary aria-[current=page]:border-primary aria-[current=page]:text-primary-foreground inline-flex h-8 items-center gap-1.5 rounded-full border bg-white px-3 text-sm";

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

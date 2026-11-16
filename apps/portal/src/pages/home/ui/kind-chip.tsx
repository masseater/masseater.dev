import { Link } from "@tanstack/react-router";
import type { Option } from "effect";
import { Record as Rec } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { ActivityKind } from "#/pages/home/model/activity.ts";

const CHIP =
  "border-line-strong hover:bg-muted aria-[current=true]:bg-primary aria-[current=true]:border-primary aria-[current=true]:text-primary-foreground inline-flex h-8 items-center rounded-full border bg-white px-3 text-sm";

export const KindChip = ({
  current,
  kind,
  label,
}: Readonly<{ current: boolean; kind: Option.Option<ActivityKind>; label: string }>): ReactNode => {
  const search = useMemo(() => Rec.getSomes({ kind }), [kind]);
  return (
    <li>
      <Link aria-current={current} className={CHIP} search={search} to="/">
        {label}
      </Link>
    </li>
  );
};

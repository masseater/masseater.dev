import { Button } from "@masseater.dev/ui/button";
import { Option } from "effect";
import type { ReactNode } from "react";

import type { MoneySearchValue } from "#/entities/money";

import { MoneyLink } from "./money-link";

export const PagerButton = ({
  label,
  search,
}: Readonly<{ label: string; search: Option.Option<MoneySearchValue> }>): ReactNode =>
  Option.match(search, {
    onNone: () => false,
    onSome: (target) => (
      <Button asChild variant="outline">
        <MoneyLink search={target}>{label}</MoneyLink>
      </Button>
    ),
  });

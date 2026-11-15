import { Option } from "effect";
import type { ReactNode } from "react";

import { whyOf } from "#/entities/watashi/index.ts";
import type { TraitValue } from "#/entities/watashi/index.ts";

export const TraitWhy = ({ trait }: Readonly<{ trait: TraitValue }>): ReactNode =>
  Option.match(whyOf(trait), {
    onNone: () => false,
    onSome: (why) => <p className="text-muted-foreground text-xs leading-relaxed">{why}</p>,
  });

import { Option } from "effect";
import type { ReactNode } from "react";

import { whyOf } from "#/entities/watashi";
import type { TraitValue } from "#/entities/watashi";

export const TraitWhy = ({ trait }: Readonly<{ trait: TraitValue }>): ReactNode =>
  Option.match(whyOf(trait), {
    onNone: () => false,
    onSome: (why) => <p className="text-muted-foreground text-xs leading-relaxed">{why}</p>,
  });

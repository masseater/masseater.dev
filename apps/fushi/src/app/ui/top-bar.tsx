import { Option } from "effect";
import type { ReactNode } from "react";

import type { Style } from "#/entities/library/index.ts";
import { LABELS } from "#/shared/config/index.ts";

export const TopBar = ({
  current: style,
}: Readonly<{ current: Option.Option<Style> }>): ReactNode => (
  <div className="flex h-12 items-center gap-3 px-4">
    <a href="#/" className="font-bold">
      {LABELS.app}
    </a>
    {Option.isSome(style) && (
      <a href="#/" className="hover:border-foreground rounded-sm border px-2 py-0.5 text-sm">
        {style.value.name}
      </a>
    )}
  </div>
);

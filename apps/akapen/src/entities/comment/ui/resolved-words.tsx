import type { Resolution } from "@masseater.dev/akapen-protocol";
import { Option } from "effect";
import type { ReactNode } from "react";

export const ResolvedWords = ({
  resolution,
}: Readonly<{ resolution: Option.Option<Resolution> }>): ReactNode =>
  Option.match(resolution, {
    onNone: () => false,
    onSome: ({ words }) => (
      <span className="text-muted-foreground block pt-1 pl-10 text-xs">{words}</span>
    ),
  });

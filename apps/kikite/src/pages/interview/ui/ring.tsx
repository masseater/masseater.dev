import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

import { useAsking, useHearing, useListening } from "#/pages/interview/model/hooks";

import { LOOKS, ringStateOf } from "./ring-look.ts";
import type { RingState } from "./ring-look.ts";

type Size = "sm" | "lg";

const SIZES: Readonly<Record<Size, string>> = {
  sm: "size-8 border-2 [&_svg]:size-4",
  lg: "size-24 border-4 [&_svg]:size-9",
};

const SPINNERS: Readonly<Record<Size, string>> = {
  sm: "border-2",
  lg: "border-4",
};

const HALOS: Readonly<Record<RingState, string>> = {
  listening: "ring-4 ring-muted",
  hearing: "ring-12 ring-primary/15",
  thinking: "border-muted",
  speaking: "ring-8 ring-primary/10",
  typing: "border-muted-foreground/40 text-muted-foreground",
  deaf: "border-dashed border-muted-foreground/60 text-muted-foreground",
};

const Ring = ({ size }: Readonly<{ size: Size }>): ReactNode => {
  const state = ringStateOf({
    listening: useListening(),
    asking: useAsking(),
    hearing: useHearing(),
  });
  const { Icon, label } = LOOKS[state];
  return (
    <span
      title={label}
      className={cn(
        "border-foreground relative flex shrink-0 items-center justify-center rounded-full transition-all duration-300",
        SIZES[size],
        HALOS[state],
      )}
    >
      {state === "thinking" && (
        <span
          className={cn(
            "border-t-foreground absolute -inset-px animate-spin rounded-full border-x-transparent border-b-transparent",
            SPINNERS[size],
          )}
        />
      )}
      <Icon aria-label={label} />
    </span>
  );
};

export { Ring };

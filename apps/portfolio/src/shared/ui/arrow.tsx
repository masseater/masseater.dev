import type { ReactNode } from "react";

const FORWARD = "→";

const BACK = "←";

const VARIANTS = {
  back: { glyph: BACK, className: "nudge-back inline-block" },
  tile: {
    glyph: FORWARD,
    className:
      "nudge-forward font-display text-foreground/50 group-hover:text-foreground inline-block shrink-0 transition",
  },
  index: {
    glyph: FORWARD,
    className:
      "nudge-forward font-display text-foreground/30 group-hover:text-foreground ml-auto hidden shrink-0 self-center text-4xl font-extralight transition sm:block",
  },
} as const;

const Arrow = ({ variant }: Readonly<{ variant: keyof typeof VARIANTS }>): ReactNode => (
  <span aria-hidden className={VARIANTS[variant].className}>
    {VARIANTS[variant].glyph}
  </span>
);

export { Arrow };

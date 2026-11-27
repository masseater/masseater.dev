import { cva } from "class-variance-authority";
import { Option } from "effect";
import type { ReactNode } from "react";

const headingVariants = cva("", {
  variants: {
    variant: {
      marked: "font-display flex items-center gap-3 text-xl",
      ruled: "border-border border-b pb-1 font-serif text-lg",
    },
  },
});

const countVariants = cva("font-sans", {
  variants: {
    variant: {
      marked: "bg-secondary rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums",
      ruled: "text-muted-foreground ms-2 text-xs",
    },
  },
});

const Count = ({
  variant,
  value,
}: Readonly<{ variant: keyof typeof MARKS; value: number | string | undefined }>): ReactNode =>
  Option.match(Option.fromUndefinedOr(value), {
    onNone: () => false,
    onSome: (shown) => <span className={countVariants({ variant })}>{shown}</span>,
  });

const MARK = (
  <span aria-hidden="true" className="bg-primary h-6 w-1.5 rounded-full" data-slot="heading-mark" />
);

const MARKS = { marked: MARK, ruled: false } as const;

export const Heading = ({
  variant,
  count,
  children,
}: Readonly<{
  variant: keyof typeof MARKS;
  count?: number | string | undefined;
  children: ReactNode;
}>): ReactNode => (
  <h2 className={headingVariants({ variant })} data-slot="heading">
    {MARKS[variant]}
    {children}
    <Count variant={variant} value={count} />
  </h2>
);

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

const footerVariants = cva("", {
  variants: {
    variant: {
      rule: "mt-16 border-t",
      links: "font-display flex items-center justify-center gap-4 px-4 pb-8",
      credit: "text-muted-foreground px-6 pb-4 text-right text-xs",
    },
  },
});

const innerVariants = cva("", {
  variants: {
    variant: {
      rule: "text-muted-foreground mx-auto max-w-6xl px-4 py-8 text-sm",
      links: "contents",
      credit: "contents",
    },
  },
});

export const PageFooter = ({
  variant,
  children,
}: Readonly<
  Required<VariantProps<typeof footerVariants>> & { children: ReactNode }
>): ReactNode => (
  <footer className={footerVariants({ variant })} data-slot="page-footer">
    <div className={innerVariants({ variant })}>{children}</div>
  </footer>
);

import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

const noticeVariants = cva("flex items-center gap-1.5", {
  variants: {
    tone: { muted: "text-muted-foreground", error: "text-destructive" },
    size: { xs: "text-xs [&>svg]:size-3.5", sm: "text-sm" },
  },
  defaultVariants: { tone: "muted", size: "sm" },
});

const Notice = ({
  tone,
  size,
  children,
}: Readonly<{
  tone?: "muted" | "error";
  size?: "xs" | "sm";
  children: ReactNode;
}>): ReactNode => <p className={noticeVariants({ tone, size })}>{children}</p>;

export { Notice };

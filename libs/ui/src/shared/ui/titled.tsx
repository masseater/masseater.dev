import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

const rootVariants = cva("flex flex-col", {
  variants: { kind: { section: "gap-4", figure: "gap-2" } },
});

const titleVariants = cva("", {
  variants: { kind: { section: "text-xl font-bold", figure: "text-sm font-medium" } },
});

const ELEMENTS = {
  section: { Root: "section", Title: "h2" },
  figure: { Root: "figure", Title: "figcaption" },
} as const;

export const Titled = ({
  kind,
  title,
  children,
}: Readonly<{ kind: keyof typeof ELEMENTS; title: string; children: ReactNode }>): ReactNode => {
  const { Root, Title } = ELEMENTS[kind];
  return (
    <Root className={rootVariants({ kind })} data-slot="titled">
      <Title className={titleVariants({ kind })}>{title}</Title>
      {children}
    </Root>
  );
};

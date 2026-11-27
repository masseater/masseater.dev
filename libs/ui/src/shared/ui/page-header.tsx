import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

const headerVariants = cva("flex", {
  variants: { layout: { stacked: "flex-col gap-5", bar: "items-center gap-3" } },
});

const titleVariants = cva("", {
  variants: {
    layout: {
      stacked: "text-3xl leading-tight font-bold md:text-4xl",
      bar: "flex-1 text-xl font-semibold",
    },
  },
});

export const PageHeader = ({
  layout,
  title,
  children,
}: Readonly<
  Required<VariantProps<typeof headerVariants>> & { title: string; children: ReactNode }
>): ReactNode => (
  <header className={headerVariants({ layout })} data-slot="page-header">
    <h1 className={titleVariants({ layout })}>{title}</h1>
    {children}
  </header>
);

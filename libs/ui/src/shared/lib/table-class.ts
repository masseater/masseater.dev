import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

export const TABLE_CONTAINER_CLASS = "relative w-full overflow-x-auto";

export const TABLE_CLASS = "w-full caption-bottom text-sm";

export const TABLE_HEADER_CLASS = "[&_tr]:border-b";

export const TABLE_BODY_CLASS = "[&_tr:last-child]:border-0";

export const TABLE_ROW_CLASS =
  "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted";

export const TABLE_CELL_CLASS =
  "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5";

export const TABLE_CAPTION_CLASS = "mt-4 text-sm text-muted-foreground";

export const tableHeadVariants = cva(
  "text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5",
  {
    variants: {
      variant: {
        plain: "h-10 px-2 font-medium text-foreground",
        tinted: "h-10 bg-muted px-4 text-xs font-bold text-muted-foreground",
        ruled: "border-b-2 border-input px-2 py-2 text-xs font-bold text-muted-foreground",
        compact: "bg-muted px-3 py-2 font-medium",
      },
    },
    defaultVariants: { variant: "plain" },
  },
);

export type TableHeadVariant = NonNullable<VariantProps<typeof tableHeadVariants>["variant"]>;

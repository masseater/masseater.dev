import { badgeOf } from "@masseater.dev/ui/badge";

export const Badge = badgeOf({
  base: "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  variants: {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive text-white dark:bg-destructive/60",
    outline: "text-foreground",
  },
  fallback: "default",
});

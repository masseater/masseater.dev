import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/cn.ts";

export type BadgeStyle<Variant extends string> = Readonly<{
  base: string;
  variants: Readonly<Record<Variant, string>>;
  fallback: NoInfer<Variant>;
}>;

export type BadgeProps<Variant extends string> = ComponentProps<"span"> &
  Readonly<{ variant?: Variant | null | undefined }>;

export const badgeOf = <Variant extends string>(
  style: BadgeStyle<Variant>,
): ((props: BadgeProps<Variant>) => ReactNode) => {
  const Badge = ({ className, variant, ...props }: BadgeProps<Variant>): ReactNode => {
    const kind = variant ?? style.fallback;
    return (
      <span
        data-slot="badge"
        data-variant={kind}
        className={cn(style.base, style.variants[kind], className)}
        {...props}
      />
    );
  };
  return Badge;
};

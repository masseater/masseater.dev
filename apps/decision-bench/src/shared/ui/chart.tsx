"use client";

import { cn } from "@masseater.dev/web-ui";
import type { ComponentProps, ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

const SIZE_CLASSES = {
  default: "aspect-video",
  fit: "",
} as const;

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;

const ChartContainer = ({
  className,
  children,
  size = "default",
  height = "100%",
  ...props
}: ComponentProps<"div"> &
  Readonly<{
    children: ComponentProps<typeof ResponsiveContainer>["children"];
    size?: keyof typeof SIZE_CLASSES;
    height?: number | "100%";
  }>): ReactNode => (
  <div
    data-slot="chart"
    className={cn(
      "flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
      SIZE_CLASSES[size],
      className,
    )}
    {...props}
  >
    <ResponsiveContainer height={height} initialDimension={INITIAL_DIMENSION}>
      {children}
    </ResponsiveContainer>
  </div>
);

export { ChartContainer };

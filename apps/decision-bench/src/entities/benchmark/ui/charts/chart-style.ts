export const ORIGIN = 0;
export const FULL_PERCENT = 100;
export const PERCENT_SCALE = [ORIGIN, FULL_PERCENT] as const;
export const SERIES_COLOR = "var(--color-chart-bar)";
export const REFERENCE_COLOR = "var(--color-muted-foreground)";
export const MARK_RADIUS = 4;
export const ERROR_WIDTH = 6;
export const AXIS_TICK = { fontSize: 12 } as const;
export const TOOLTIP_STYLE = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  color: "var(--color-popover-foreground)",
  fontSize: 12,
} as const;

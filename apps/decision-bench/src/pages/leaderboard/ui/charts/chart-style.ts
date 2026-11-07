const ORIGIN = 0;
const FULL_PERCENT = 100;
const PERCENT_SCALE = [ORIGIN, FULL_PERCENT] as const;
const SERIES_COLOR = "var(--color-chart-bar)";
const REFERENCE_COLOR = "var(--color-muted-foreground)";
const MARK_RADIUS = 4;
const ERROR_WIDTH = 6;
const AXIS_TICK = { fontSize: 12 } as const;
const TOOLTIP_STYLE = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  color: "var(--color-popover-foreground)",
  fontSize: 12,
} as const;

export {
  AXIS_TICK,
  ERROR_WIDTH,
  FULL_PERCENT,
  MARK_RADIUS,
  ORIGIN,
  PERCENT_SCALE,
  REFERENCE_COLOR,
  SERIES_COLOR,
  TOOLTIP_STYLE,
};

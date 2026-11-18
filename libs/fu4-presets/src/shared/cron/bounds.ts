export interface Bounds {
  readonly min: number;
  readonly max: number;
  readonly names: readonly string[];
}

export type FieldName = "minute" | "hour" | "day" | "month" | "weekday";

export const BOUNDS: Readonly<Record<FieldName, Bounds>> = {
  minute: { min: 0, max: 59, names: [] },
  hour: { min: 0, max: 23, names: [] },
  day: { min: 1, max: 31, names: [] },
  month: {
    min: 1,
    max: 12,
    names: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"],
  },
  weekday: { min: 0, max: 6, names: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] },
};

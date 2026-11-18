const WHOLE = 100;

const NOTHING = 0;

export const shareOf =
  (total: number) =>
  (part: number): number => {
    if (total <= NOTHING) {
      return NOTHING;
    }
    return part / total;
  };

export const percent = (ratio: number): string => `${String(Math.round(ratio * WHOLE))}%`;

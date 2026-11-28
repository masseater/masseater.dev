const MILLISECONDS_PER_DAY = 86_400_000;

export const seedOfDay = (epochMillis: number): number =>
  Math.floor(epochMillis / MILLISECONDS_PER_DAY);

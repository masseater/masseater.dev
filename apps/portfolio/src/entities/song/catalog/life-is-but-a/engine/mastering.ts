export const MASTER = {
  compression: {
    threshold: -9,
    ratio: 2,
    attack: 12,
    release: 140,
    makeup: 1.2,
    sidechainHighPass: 120,
    every: 16,
  },
  clip: { threshold: 0.66, knee: 0.4 },
  limit: { ceiling: -1.4, lookahead: 3, release: 70, every: 4 },
} as const;

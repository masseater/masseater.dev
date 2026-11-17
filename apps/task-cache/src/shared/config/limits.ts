const KIB = 1024;
const MIB = KIB * KIB;
const GIB = MIB * KIB;
const REQUEST_MIB = 32;
const INLINE_VALUE_KIB = 256;
const RESPONSE_MIB = 8;
const STORED_GIB = 3;

export const SECONDS_PER_DAY = 86_400;

export const LIMITS = {
  requestBytes: REQUEST_MIB * MIB,
  inlineValueBytes: INLINE_VALUE_KIB * KIB,
  responseBytes: RESPONSE_MIB * MIB,
  entriesPerKey: 8,
  storedBytes: STORED_GIB * GIB,
  retentionDays: 7,
  uploadsPerDay: 5000,
  objectReadsPerDay: 100_000,
  requestsPerMinute: 1200,
} as const;

import { DateTime } from "effect";

import { PLAY_AT } from "#config";

const LATE_START = { minutes: 10 } as const;

const nextPlayAt = (now: DateTime.Utc): number => {
  const today = DateTime.setParts(now, {
    hour: PLAY_AT.hour,
    minute: PLAY_AT.minute,
    second: 0,
    millisecond: 0,
  });
  const missed = DateTime.isLessThan(DateTime.add(today, LATE_START), now);
  return DateTime.toEpochMillis(DateTime.add(today, { days: Number(missed) }));
};

export { nextPlayAt };

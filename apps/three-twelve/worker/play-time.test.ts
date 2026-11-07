import { DateTime } from "effect";
import { expect, test } from "vite-plus/test";

import { nextPlayAt } from "./play-time.ts";

const at = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

test("cron が起きた日の 3 時 12 分（JST）に流す", () => {
  expect(nextPlayAt(at("2026-11-06T18:11:00Z"))).toBe(
    DateTime.toEpochMillis(at("2026-11-06T18:12:00Z")),
  );
});

test("大きく遅れて起きたら翌日に回す", () => {
  expect(nextPlayAt(at("2026-11-06T18:30:00Z"))).toBe(
    DateTime.toEpochMillis(at("2026-11-07T18:12:00Z")),
  );
});

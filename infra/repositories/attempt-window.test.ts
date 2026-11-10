import { Array as Arr, Option, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { admit } from "./attempt-window.ts";

const START = 1_800_000_000_000;
const WINDOW_MILLIS = 600_000;
const LIMIT = 5;
const ONE_MILLI = 1;
const NEXT_WINDOW = START + WINDOW_MILLIS;
const LAST_MILLI = NEXT_WINDOW - ONE_MILLI;

type Trial = Readonly<{ stored: Option.Option<string>; statuses: readonly string[] }>;

const FRESH: Trial = { stored: Option.none(), statuses: [] };

const attempt = ({ stored, statuses }: Trial, now: number): Trial => {
  const admission = admit({ now, stored });
  if (admission.status === "admitted") {
    return { stored: Option.some(admission.stored), statuses: [...statuses, admission.status] };
  }
  return { stored, statuses: [...statuses, admission.status] };
};

const attempts = (trial: Trial, times: readonly number[]): Trial =>
  pipe(times, Arr.scan(trial, attempt), Arr.lastNonEmpty);

const times = (count: number, now: number): readonly number[] => Arr.makeBy(count, () => now);

const FULL = attempts(FRESH, times(LIMIT, START));

const ADMITTED = Arr.makeBy(LIMIT, () => "admitted");

test("窓の中では 5 回まで通し、6 回目からは断る", () => {
  expect(FULL.statuses).toStrictEqual(ADMITTED);
  expect(attempts(FULL, [START, START]).statuses).toStrictEqual([
    ...ADMITTED,
    "limited",
    "limited",
  ]);
});

test("断った試行は数えず、保管する値を変えない", () => {
  expect(attempts(FULL, [START + ONE_MILLI]).stored).toStrictEqual(FULL.stored);
});

test("窓が終わる直前までは断り、10 分たてば新しい窓で 5 回まで通す", () => {
  expect(attempts(FULL, [LAST_MILLI]).statuses).toStrictEqual([...ADMITTED, "limited"]);
  expect(attempts(FULL, [...times(LIMIT, NEXT_WINDOW), NEXT_WINDOW]).statuses).toStrictEqual([
    ...ADMITTED,
    ...ADMITTED,
    "limited",
  ]);
});

test("窓は最初の試行から 10 分で終わり、途中の試行では延びない", () => {
  const spread = attempts(FRESH, [START, LAST_MILLI]);
  expect(attempts(spread, times(LIMIT, NEXT_WINDOW)).statuses).toStrictEqual([
    "admitted",
    "admitted",
    ...ADMITTED,
  ]);
});

test("読めない値や未来の窓は、新しい窓として数え直す", () => {
  expect(admit({ now: START, stored: Option.some("not-json") }).status).toBe("admitted");
  const future = attempts(FRESH, times(LIMIT, NEXT_WINDOW));
  expect(admit({ now: START, stored: future.stored }).status).toBe("admitted");
});

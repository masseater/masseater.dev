import { Option, Result, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { intervalSeconds, parseCron } from "./index.ts";

const interval = (spec: string): Option.Option<number> =>
  pipe(parseCron(spec), Result.getOrThrow, intervalSeconds);

const FOUR_MINUTES = 240;
const DAY = 86_400;
const YEAR = 31_536_000;

test("computes the shortest interval between runs", () => {
  expect(interval("*/4 * * * *")).toStrictEqual(Option.some(FOUR_MINUTES));
  expect(interval("0 0 * * *")).toStrictEqual(Option.some(DAY));
  expect(interval("0 0 1 1 *")).toStrictEqual(Option.some(YEAR));
  expect(interval("0 0 30 2 *")).toStrictEqual(Option.none());
});

test("reports errors in the wording of robfig/cron", () => {
  expect(parseCron("0 */3 * *")).toStrictEqual(
    Result.fail("expected exactly 5 fields, found 4: [0 */3 * *]"),
  );
  expect(parseCron("61 * * * *")).toStrictEqual(
    Result.fail("end of range (61) above maximum (59): 61"),
  );
  expect(parseCron("x * * * *")).toStrictEqual(
    Result.fail('failed to parse int from x: strconv.Atoi: parsing "x": invalid syntax'),
  );
});

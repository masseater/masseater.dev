import { Option, Result, String as Str } from "effect";

import type { ScheduleEvent } from "#/entities/workflow/model/types.ts";
import type { Fail } from "#/features/actionlint/lib/workflow-rule.ts";
import { intervalSeconds, parseCron } from "#/shared/cron/index.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

const MIN_INTERVAL = 300;
const RESERVED = new Set(["utc", "local"]);

const checkCron =
  (fail: Fail) =>
  (spec: Text): void => {
    const parsed = parseCron(spec.value);
    if (Result.isFailure(parsed)) {
      fail(spec, `invalid CRON format ${quote(spec.value)} in schedule event: ${parsed.failure}`);
      return;
    }
    const tooShort = Option.filter(
      intervalSeconds(parsed.success),
      (seconds) => seconds < MIN_INTERVAL,
    );
    for (const seconds of Option.toArray(tooShort)) {
      fail(
        spec,
        `scheduled job runs too frequently. it runs once per ${String(seconds)} seconds. the shortest interval is once every 5 minutes`,
      );
    }
  };

const isKnownZone = (name: string): boolean =>
  Result.isSuccess(Result.try(() => new Intl.DateTimeFormat("en", { timeZone: name })));

const isValidZone = (name: string): boolean =>
  Str.isNonEmpty(name) && !RESERVED.has(Str.toLowerCase(name)) && isKnownZone(name);

const checkTimezone =
  (fail: Fail) =>
  (timezone: Text): void => {
    if (!isValidZone(timezone.value)) {
      fail(
        timezone,
        `invalid timezone ${quote(timezone.value)} in schedule event. it must be a valid IANA timezone name`,
      );
    }
  };

export const checkSchedule =
  (fail: Fail) =>
  (event: ScheduleEvent): void => {
    for (const schedule of event.schedules) {
      checkCron(fail)(schedule.cron);
      for (const timezone of Option.toArray(Option.fromNullishOr(schedule.timezone))) {
        checkTimezone(fail)(timezone);
      }
    }
  };

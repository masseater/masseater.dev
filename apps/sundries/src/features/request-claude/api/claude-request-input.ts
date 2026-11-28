import { Cron, DateTime, Option, Predicate, Result, Schema } from "effect";

const MAX_TEXT = 65_536;
const MAX_REQUEST = 60_000;
const MAX_NAME = 80;
const MAX_DESCRIPTION = 500;
const MAX_PROMPT = 10_000;
const FIRST_ID = 1;
const BEFORE_FIRST = 0;
const HTTPS = /^https:\/\//u;
const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/u;

const LongText = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_TEXT));

const RequestText = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_REQUEST));

const RequestId = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_ID));

const ThreadUrl = Schema.String.check(Schema.isPattern(HTTPS));

const After = Schema.Int.check(Schema.isGreaterThanOrEqualTo(BEFORE_FIRST));

const Slug = Schema.String.check(Schema.isPattern(SLUG));

const Project = Slug.annotate({
  description:
    "The claude.ai project whose receiver routine was registered under this name. Omit for the project registered without a name",
});

const ScheduleId = Slug.annotate({ description: "The schedule's id, a lowercase slug" });

const CronText = Schema.NonEmptyString.check(
  Schema.makeFilter<string>(
    (cron) => Result.isSuccess(Cron.parse(cron)) || "not a cron expression",
  ),
).annotate({ description: "Five-field cron, read in timezone" });

const TimeZone = Schema.NonEmptyString.check(
  Schema.makeFilter<string>(
    (zone) => Option.isSome(DateTime.zoneMakeNamed(zone)) || "not an IANA time zone",
  ),
).annotate({ description: "IANA time zone, Asia/Tokyo when omitted" });

const Name = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_NAME));

const Description = Schema.String.check(Schema.isMaxLength(MAX_DESCRIPTION));

const Prompt = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_PROMPT)).annotate({
  description: "What the work thread is asked to do, such as a skill to run",
});

const Model = Schema.NonEmptyString.annotate({
  description: "Model the work thread switches to; the project default when omitted",
});

const exactlyOne = ({ text, schedule }: Readonly<{ text?: string; schedule?: string }>): boolean =>
  Predicate.isUndefined(text) !== Predicate.isUndefined(schedule);

export const SendInput = Schema.Struct({
  text: Schema.optionalKey(
    RequestText.annotate({
      description: "Read as the request as is. Read the reply with list_claude_replies",
    }),
  ),
  schedule: Schema.optionalKey(
    ScheduleId.annotate({ description: "Run this schedule now instead of sending text" }),
  ),
  project: Schema.optionalKey(Project),
}).check(
  Schema.makeFilter((input) => exactlyOne(input) || "give exactly one of text and schedule"),
);

export const TakeInput = Schema.Struct({ project: Schema.optionalKey(Project) });

export const ReplyInput = Schema.Struct({
  id: RequestId,
  reply: LongText.annotate({ description: "The result, URLs of what you made, or questions" }),
  threadUrl: ThreadUrl.annotate({ description: "Your thread" }),
});

export const ListInput = Schema.Struct({
  after: Schema.optionalKey(
    After.annotate({
      description: "Omit for the newest 50; otherwise the 50 after this id, oldest first",
    }),
  ),
  schedule: Schema.optionalKey(ScheduleId.annotate({ description: "Only this schedule's runs" })),
});

export const RoutineInput = Schema.Struct({
  triggerId: Schema.NonEmptyString.annotate({
    description:
      "The project routine's trig_ id. It starts a thread whose payload is the request text",
  }),
  token: Schema.NonEmptyString.annotate({
    description: "The routine's API trigger token, sk-ant-oat01-",
  }),
  project: Schema.optionalKey(Project),
});

export const ListSchedulesInput = Schema.Struct({});

export const GetScheduleInput = Schema.Struct({ id: ScheduleId });

export const CreateScheduleInput = Schema.Struct({
  id: ScheduleId,
  name: Name,
  description: Description,
  cron: CronText,
  timezone: Schema.optionalKey(TimeZone),
  project: Schema.optionalKey(Project),
  model: Schema.optionalKey(Model),
  prompt: Prompt,
  enabled: Schema.optionalKey(Schema.Boolean.annotate({ description: "true when omitted" })),
});

export const UpdateScheduleInput = Schema.Struct({
  id: ScheduleId,
  name: Schema.optionalKey(Name),
  description: Schema.optionalKey(Description),
  cron: Schema.optionalKey(CronText),
  timezone: Schema.optionalKey(TimeZone),
  project: Schema.optionalKey(Project.pipe(Schema.NullOr)),
  model: Schema.optionalKey(Model.pipe(Schema.NullOr)),
  prompt: Schema.optionalKey(Prompt),
  enabled: Schema.optionalKey(Schema.Boolean),
});

export type CreateSchedule = typeof CreateScheduleInput.Type;

export type UpdateSchedule = typeof UpdateScheduleInput.Type;

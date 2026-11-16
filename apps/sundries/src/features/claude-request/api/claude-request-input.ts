import { Schema } from "effect";

const MAX_TEXT = 65_536;
const FIRST_ID = 1;
const BEFORE_FIRST = 0;
const HTTPS = /^https:\/\//u;

const LongText = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_TEXT));

const RequestId = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_ID));

const ThreadUrl = Schema.String.check(Schema.isPattern(HTTPS));

const After = Schema.Int.check(Schema.isGreaterThanOrEqualTo(BEFORE_FIRST));

export const SendInput = Schema.Struct({
  text: LongText.annotate({
    description: "Read as the request as is",
  }),
});

export const TakeInput = Schema.Struct({});

export const ReplyInput = Schema.Struct({
  id: RequestId,
  reply: LongText,
  threadUrl: ThreadUrl.annotate({ description: "Your thread" }),
});

export const ListInput = Schema.Struct({
  after: Schema.optionalKey(After),
});

export const RoutineInput = Schema.Struct({
  triggerId: Schema.NonEmptyString.annotate({
    description: "The routine's trig_ id",
  }),
  token: Schema.NonEmptyString.annotate({
    description: "The routine's API trigger token, sk-ant-oat01-",
  }),
});

import { Schema } from "effect";

const MAX_TEXT = 65_536;
const MAX_REQUEST = 60_000;
const FIRST_ID = 1;
const BEFORE_FIRST = 0;
const HTTPS = /^https:\/\//u;

const LongText = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_TEXT));

const RequestText = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_REQUEST));

const RequestId = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_ID));

const ThreadUrl = Schema.String.check(Schema.isPattern(HTTPS));

const After = Schema.Int.check(Schema.isGreaterThanOrEqualTo(BEFORE_FIRST));

export const SendInput = Schema.Struct({
  text: RequestText.annotate({
    description: "Read as the request as is. Read the reply with list_claude_replies",
  }),
});

export const TakeInput = Schema.Struct({});

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
});

export const RoutineInput = Schema.Struct({
  triggerId: Schema.NonEmptyString.annotate({
    description:
      "The project routine's trig_ id. It starts a thread whose payload is the request text",
  }),
  token: Schema.NonEmptyString.annotate({
    description: "The routine's API trigger token, sk-ant-oat01-",
  }),
});

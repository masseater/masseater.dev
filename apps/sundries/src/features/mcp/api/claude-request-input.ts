import { Schema } from "effect";

const MAX_TEXT = 65_536;
const FIRST_ID = 1;
const BEFORE_FIRST = 0;
const HTTPS = /^https:\/\//u;

const LongText = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_TEXT));

const RequestId = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_ID));

const ThreadUrl = Schema.String.check(Schema.isPattern(HTTPS));

const After = Schema.Int.check(Schema.isGreaterThanOrEqualTo(BEFORE_FIRST));

const SendInput = Schema.Struct({
  text: LongText.annotate({
    description: "Claude にやってほしいことの本文。そのまま依頼として読まれる",
  }),
});

const TakeInput = Schema.Struct({});

const ReplyInput = Schema.Struct({
  id: RequestId.annotate({ description: "take_claude_requests が返した依頼の id" }),
  reply: LongText.annotate({ description: "依頼した人に返す結果や質問" }),
  threadUrl: ThreadUrl.annotate({ description: "依頼を受けたスレッドの URL" }),
});

const ListInput = Schema.Struct({
  after: Schema.optionalKey(
    After.annotate({ description: "この id より後の依頼だけを返す。省くと新しい順に返す" }),
  ),
});

export { ListInput, ReplyInput, SendInput, TakeInput };

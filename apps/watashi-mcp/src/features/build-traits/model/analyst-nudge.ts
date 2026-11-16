import { Array as Arr, Option, Schema, pipe } from "effect";

export const RECORD_TOOL = "record_observations";

export const NUDGE = `You have not called \`${RECORD_TOOL}\` yet. Call it now with every observation, or with an empty \`observations\` list when the sources show none.`;

const Said = Schema.Struct({
  role: Schema.Literal("assistant"),
  content: Schema.Array(Schema.Unknown),
});

const Asked = Schema.Struct({ role: Schema.Literal("user"), content: Schema.Unknown });

const Call = Schema.Struct({ type: Schema.Literal("toolCall"), name: Schema.Literal(RECORD_TOOL) });

const isSaid = Schema.is(Said);

const isAsked = Schema.is(Asked);

const isCall = Schema.is(Call);

const called = (message: unknown): boolean =>
  isSaid(message) &&
  pipe(
    message.content,
    Arr.some((part) => isCall(part)),
  );

const wasNudge = (message: unknown): boolean => isAsked(message) && message.content === NUDGE;

export const needsNudge = ({
  answer,
  newestFirst,
}: Readonly<{ answer: unknown; newestFirst: readonly unknown[] }>): boolean => {
  const run = pipe(
    newestFirst,
    Arr.takeWhile((message) => !isAsked(message)),
  );
  const asked = pipe(
    newestFirst,
    Arr.findFirst((message) => isAsked(message)),
  );
  return !called(answer) && !pipe(run, Arr.some(called)) && !pipe(asked, Option.exists(wasNudge));
};

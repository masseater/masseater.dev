import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options, SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { Effect, Option, Result, Stream, pipe } from "effect";

const QUIET_OPTIONS = {
  settingSources: [],
  persistSession: false,
  thinking: { type: "disabled" },
} satisfies Options;

const TEXT_OPTIONS = {
  ...QUIET_OPTIONS,
  tools: [],
  maxTurns: 1,
  includePartialMessages: true,
} satisfies Options;

const executableOptions = (executable: Option.Option<string>): Options =>
  pipe(
    executable,
    Option.match({
      onNone: () => ({}),
      onSome: (path) => ({ pathToClaudeCodeExecutable: path }),
    }),
  );

const reasonOf = (message: SDKResultMessage): string => {
  if (message.subtype === "success") {
    return message.result;
  }
  return message.subtype;
};

const textOf =
  <Failure>(failure: (cause: unknown) => Failure) =>
  (message: SDKMessage): Effect.Effect<Result.Result<string, void>, Failure> => {
    if (message.type === "result" && message.is_error) {
      return Effect.fail(failure(reasonOf(message)));
    }
    if (
      message.type === "stream_event" &&
      message.event.type === "content_block_delta" &&
      message.event.delta.type === "text_delta"
    ) {
      return Effect.succeed(Result.succeed(message.event.delta.text));
    }
    return Effect.succeed(Result.failVoid);
  };

const textStream = <Failure>({
  prompt,
  system,
  model,
  executable,
  failure,
}: Readonly<{
  prompt: string;
  system: string;
  model: string;
  executable: Option.Option<string>;
  failure: (cause: unknown) => Failure;
}>): Stream.Stream<string, Failure> =>
  Stream.fromAsyncIterable(
    query({
      prompt,
      options: { ...TEXT_OPTIONS, ...executableOptions(executable), model, systemPrompt: system },
    }),
    failure,
  ).pipe(Stream.filterMapEffect(textOf(failure)));

export { QUIET_OPTIONS, executableOptions, textStream };

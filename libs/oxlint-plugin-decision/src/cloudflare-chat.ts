import {
  Array as Arr,
  Boolean as Bool,
  Config,
  Effect,
  Number as Num,
  Option,
  Record as Rec,
  Schedule,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { appContext } from "./openrouter-app.ts";
import { captured, envNameOf, toJson } from "./runtime.ts";
import type { Answers, DecideInput, DecisionResponse, Question } from "./types.ts";
import type { WireRequest } from "./wire.ts";

const TOOL = "oxlint-plugin-decision";
const DEFAULT_API_URL = "https://api.cloudflare.com/client/v4";
const DEFAULT_GATEWAY = "default";
const CHAT_PATH = "/ai/v1/chat/completions";
const TRAILING_SLASHES = /\/+$/u;
const WORKERS_AI = "@cf/";
const TOP_LOGPROBS = 10;
const TOKENS_PER_ANSWER = 8;
const SPARE_TOKENS = 16;
const FIRST_LABEL = 1;
const NONE = 0;
const CERTAIN = 1;
const FIRST_REDIRECT = 300;
const RETRY_INITIAL_MS = 10;
const RETRY_EXPONENT = 2;
const LEADING_JUNK = /^(?<lead>[\s:：*]*)(?<word>[\s\S]*)$/u;
const LABEL_BEFORE = /(?:^|\n)[\s*]*q(?<index>\d+)[\s*]*[:：]\s*$/u;
const ANSWER_WORD = /^(?<word>yes|no)[\s.,!*]*$/iu;

const SYSTEM = Arr.join(
  [
    "You answer yes-or-no questions about the material the user gives you.",
    "Answer every question on its own line in the form `q<number>: yes` or `q<number>: no`, in the order asked.",
    "Write nothing else.",
  ],
  " ",
);

const TopLogprob = Schema.Struct({ token: Schema.String, logprob: Schema.Finite });

const TokenLogprob = Schema.Struct({
  token: Schema.String,
  logprob: Schema.Finite,
  top_logprobs: Schema.optional(Schema.Array(TopLogprob)),
});

const Logprobs = Schema.Struct({ content: Schema.NullOr(Schema.Array(TokenLogprob)) });

const OptionalLogprobs = Schema.optional(Schema.NullOr(Logprobs));

const Choice = Schema.Struct({ logprobs: OptionalLogprobs });

const ChatResponse = Schema.Struct({
  model: Schema.optional(Schema.String),
  choices: Schema.NonEmptyArray(Choice),
});

const ChatBody = Schema.Struct({ body: ChatResponse });

const ErrorBody = Schema.Struct({
  errors: Schema.NonEmptyArray(Schema.Struct({ message: Schema.String })),
});

const decodeErrorBody = Schema.decodeUnknownOption(ErrorBody);

export type Token = typeof TokenLogprob.Type;

export type YesNo = "yes" | "no";

type Mass = Readonly<Record<YesNo, number>>;

type Asked = readonly (readonly [string, Question])[];

interface Split {
  readonly lead: string;
  readonly word: string;
}

const labelOf = (index: number): string => `q${String(Num.sum(index, FIRST_LABEL))}`;

const accountUrl = ({ api, account }: Readonly<{ api: string; account: string }>): string =>
  `${Str.replace(TRAILING_SLASHES, "")(Str.trim(api))}/accounts/${Str.trim(account)}`;

export const endpointOf = (env: DecideInput["env"]): Config.Config<string> =>
  Config.all({
    api: Config.String(envNameOf(env, "CLOUDFLARE_API_BASE_URL")).pipe(
      Config.withDefault(DEFAULT_API_URL),
    ),
    account: Config.NonEmptyString(envNameOf(env, "CLOUDFLARE_ACCOUNT_ID")),
  }).pipe(Config.map(accountUrl));

const yesNoOf = (word: string): YesNo =>
  Bool.match(Str.toLowerCase(word) === "yes", { onTrue: () => "yes", onFalse: () => "no" });

const answerOf = (text: string): Option.Option<YesNo> =>
  captured(Str.match(ANSWER_WORD)(text), "word").pipe(Option.map(yesNoOf));

const splitToken = (token: string): Split => {
  const match = Str.match(LEADING_JUNK)(token);
  return {
    lead: Option.getOrElse(captured(match, "lead"), () => ""),
    word: Option.getOrElse(captured(match, "word"), () => token),
  };
};

const massOf = (token: Token): Mass => {
  const mass = { yes: NONE, no: NONE };
  for (const alternative of token.top_logprobs ?? [token]) {
    const answer = answerOf(splitToken(alternative.token).word);
    if (Option.isSome(answer)) {
      mass[answer.value] += Math.exp(alternative.logprob);
    }
  }
  return mass;
};

const yesOf = (token: Token, answer: YesNo): number => {
  const mass = massOf(token);
  const total = Num.sum(mass.yes, mass.no);
  if (total > NONE) {
    return mass.yes / total;
  }
  return Bool.match(answer === "yes", { onTrue: () => CERTAIN, onFalse: () => NONE });
};

const labelIndexOf = (text: string): Option.Option<number> =>
  captured(Str.match(LABEL_BEFORE)(text), "index").pipe(
    Option.map((index) => Num.subtract(Number(index), FIRST_LABEL)),
  );

export const yesByLabel = (tokens: readonly Token[]): ReadonlyMap<number, number> => {
  const found = new Map<number, number>();
  let text = "";
  for (const token of tokens) {
    const { lead, word } = splitToken(token.token);
    const answer = answerOf(word);
    const index = labelIndexOf(`${text}${lead}`);
    if (Option.isSome(answer) && Option.isSome(index) && !found.has(index.value)) {
      found.set(index.value, yesOf(token, answer.value));
    }
    text = `${text}${token.token}`;
  }
  return found;
};

const stateText = (state: WireRequest["state"]): string => {
  if (typeof state === "string") {
    return state;
  }
  return toJson(state);
};

const promptOf = (wire: WireRequest, questions: Asked): string => {
  const asked = pipe(
    questions,
    Arr.map(([, question], index) => `${labelOf(index)}: ${question.instructions}`),
    Arr.join("\n"),
  );
  return `${stateText(wire.state)}\n\nQuestions:\n${asked}`;
};

const templateOf = (model: string): Readonly<Record<string, unknown>> => {
  if (Str.startsWith(WORKERS_AI)(model)) {
    return { chat_template_kwargs: { enable_thinking: false, thinking: false } };
  }
  return {};
};

const bodyOf = (wire: WireRequest, questions: Asked): Readonly<Record<string, unknown>> => ({
  model: wire.model,
  temperature: NONE,
  logprobs: true,
  top_logprobs: TOP_LOGPROBS,
  max_tokens: Num.sum(Num.multiply(questions.length, TOKENS_PER_ANSWER), SPARE_TOKENS),
  messages: [
    { role: "system", content: SYSTEM },
    { role: "user", content: promptOf(wire, questions) },
  ],
  ...templateOf(wire.model),
});

const messageOfBody = (body: unknown): string =>
  Option.match(decodeErrorBody(body), {
    onNone: () => "request failed",
    onSome: ({ errors }) =>
      pipe(
        errors,
        Arr.map(({ message }) => message),
        Arr.join("; "),
      ),
  });

const failureOf = (response: HttpClientResponse.HttpClientResponse): Effect.Effect<never, string> =>
  response.json.pipe(
    Effect.option,
    Effect.flatMap((body) =>
      Effect.fail(`http ${String(response.status)}: ${messageOfBody(Option.getOrUndefined(body))}`),
    ),
  );

const answersOf = (questions: Asked, tokens: readonly Token[]): Effect.Effect<Answers, string> => {
  const byLabel = yesByLabel(tokens);
  const answered = pipe(
    questions,
    Arr.flatMap(([id], index) =>
      pipe(
        Option.fromUndefinedOr(byLabel.get(index)),
        Option.map((noul) => [id, { type: "noul", noul }] as const),
        Option.toArray,
      ),
    ),
  );
  if (answered.length < questions.length) {
    return Effect.fail("the model did not answer every question with yes or no");
  }
  return Effect.succeed(Rec.fromEntries(answered));
};

const tokensOf = ({ body }: typeof ChatBody.Type): readonly Token[] => {
  const [{ logprobs }] = body.choices;
  return Option.fromNullishOr(logprobs).pipe(
    Option.flatMap(({ content }) => Option.fromNullishOr(content)),
    Option.getOrElse((): readonly Token[] => []),
  );
};

const post = Effect.fn("post")(function* post(
  endpoint: string,
  wire: WireRequest,
  { env }: Pick<DecideInput, "env">,
) {
  const token = yield* Config.Redacted(envNameOf(env, "CLOUDFLARE_API_TOKEN"));
  const gateway = yield* Config.String(envNameOf(env, "CLOUDFLARE_AI_GATEWAY_ID")).pipe(
    Config.withDefault(DEFAULT_GATEWAY),
  );
  const app = yield* appContext;
  const body = bodyOf(wire, Rec.toEntries(wire.questions));
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.retryTransient({
      retryOn: "response-only",
      schedule: Schedule.exponential(RETRY_INITIAL_MS, RETRY_EXPONENT),
    }),
  );
  return yield* HttpClientRequest.post(`${endpoint}${CHAT_PATH}`).pipe(
    HttpClientRequest.bearerToken(token),
    HttpClientRequest.setHeaders({
      "cf-aig-gateway-id": gateway,
      "cf-aig-metadata": toJson({ tool: TOOL, ...app }),
    }),
    HttpClientRequest.bodyJsonUnsafe(body),
    client.execute,
  );
});

export const sendChat = Effect.fn("sendChat")(function* sendChat(
  endpoint: string,
  wire: WireRequest,
  input: Pick<DecideInput, "env">,
) {
  const response = yield* post(endpoint, wire, input).pipe(
    Effect.mapError((error) => `network: ${error.message}`),
  );
  if (response.status >= FIRST_REDIRECT) {
    return yield* failureOf(response);
  }
  const chat = yield* HttpClientResponse.schemaJson(ChatBody)(response).pipe(
    Effect.mapError((error) => `invalid response: ${error.message}`),
  );
  const answers = yield* answersOf(Rec.toEntries(wire.questions), tokensOf(chat));
  return { model: chat.body.model ?? wire.model, answers } satisfies DecisionResponse;
});

/** @internal */
/** @internal */

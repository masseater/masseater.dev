import { Array as Arr, Effect, Option, Path, String as Str, pipe } from "effect";
import { Base64, Base64Url } from "effect/encoding";

import { BETTERLEAKS_VERSION } from "./betterleaks-config.ts";
import { encodeJson } from "./json-lines.ts";
import type { Json } from "./json-lines.ts";

type FakeSecret = Readonly<{ name: string; value: string; context: string }>;

type Placement = Readonly<{
  name: string;
  line: (secret: FakeSecret) => Effect.Effect<string>;
  needle: (secret: FakeSecret) => Effect.Effect<string>;
}>;

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const LOWER_ALNUM = "abcdefghijklmnopqrstuvwxyz0123456789";
const UPPER_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const HEX = "0123456789abcdef";
const DIGITS = "0123456789";
const URL_SAFE = `${ALNUM}_-`;
const MIXED_TAIL = "Aa0";
const PEM_LINE = 64;
const JWT_SIGNATURE_BYTES = 32;
const JWT_SUBJECT = 24;
const ISSUED_AT = 1_800_000_000;
const GITHUB_PAT = 36;
const FINE_GRAINED_HEAD = 22;
const FINE_GRAINED_TAIL = 59;
const ANTHROPIC_KEY = 93;
const OPENAI_HALF = 74;
const OPENROUTER_KEY = 64;
const NPM_TOKEN = 35;
const SLACK_TEAM = 12;
const SLACK_BOT = 13;
const SLACK_SECRET = 24;
const STRIPE_KEY = 32;
const AWS_KEY = 16;
const GCP_KEY = 35;
const CLOUDFLARE_TOKEN = 40;
const PASTED_TOKEN = 48;
const WATASHI_TOKEN = 43;
const START = 0;
const ONE = 1;
const SESSION = "d2ecb348-3cde-4a66-93b9-6229842073a9";
const IDS = {
  uuid: "00000000-0000-4000-8000-000000000002",
  parentUuid: "00000000-0000-4000-8000-000000000001",
  timestamp: "2026-11-09T14:35:33.548Z",
  sessionId: SESSION,
};
const TOOL_USE_ID = "toolu_01CJcqCebo0eaEkGVdkHlGiF";

const encoder = new TextEncoder();

const charOf =
  (alphabet: string) =>
  (value: number): string =>
    Option.getOrElse(Str.charAt(value % alphabet.length)(alphabet), () => "");

const pick =
  (alphabet: string) =>
  (length: number): string =>
    pipe(
      [...crypto.getRandomValues(new Uint32Array(length))],
      Arr.map(charOf(alphabet)),
      Arr.join(""),
    );

const mixed =
  (alphabet: string) =>
  (length: number): string =>
    `${pick(alphabet)(length - MIXED_TAIL.length)}${MIXED_TAIL}`;

const base64UrlJson = (value: Json): Effect.Effect<string> =>
  encodeJson(value).pipe(Effect.map((text) => Base64Url.encode(encoder.encode(text))));

const jwt: Effect.Effect<string> = Effect.all([
  base64UrlJson({ alg: "HS256", typ: "JWT" }),
  base64UrlJson({ sub: pick(ALNUM)(JWT_SUBJECT), iat: ISSUED_AT }),
]).pipe(
  Effect.map(([header, payload]) => {
    const signature = Base64Url.encode(crypto.getRandomValues(new Uint8Array(JWT_SIGNATURE_BYTES)));
    return `${header}.${payload}.${signature}`;
  }),
);

const pemOf = (der: ArrayBuffer): string => {
  const body = Base64.encode(new Uint8Array(der));
  const lines = pipe(
    Arr.range(START, Math.ceil(body.length / PEM_LINE) - ONE),
    Arr.map((index) => Str.slice(index * PEM_LINE, (index + ONE) * PEM_LINE)(body)),
  );
  return `-----BEGIN PRIVATE KEY-----\n${Arr.join(lines, "\n")}\n-----END PRIVATE KEY-----\n`;
};

const privateKey: Effect.Effect<string> = Effect.promise(() =>
  crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]),
).pipe(
  Effect.flatMap((pair) => Effect.promise(() => crypto.subtle.exportKey("pkcs8", pair.privateKey))),
  Effect.map(pemOf),
);

const prefixedSecrets = (): readonly FakeSecret[] => [
  { name: "github-pat", value: `ghp_${mixed(ALNUM)(GITHUB_PAT)}`, context: "GitHub のトークン" },
  {
    name: "github-fine-grained-pat",
    value: `github_pat_${mixed(ALNUM)(FINE_GRAINED_HEAD)}_${mixed(ALNUM)(FINE_GRAINED_TAIL)}`,
    context: "fine-grained token",
  },
  {
    name: "anthropic-api-key",
    value: `sk-ant-api03-${mixed(URL_SAFE)(ANTHROPIC_KEY)}AA`,
    context: "ANTHROPIC_API_KEY",
  },
  {
    name: "openai-api-key",
    value: `sk-proj-${mixed(URL_SAFE)(OPENAI_HALF)}T3BlbkFJ${mixed(URL_SAFE)(OPENAI_HALF)}`,
    context: "OpenAI",
  },
  {
    name: "openrouter-api-key",
    value: `sk-or-v1-${pick(HEX)(OPENROUTER_KEY)}`,
    context: "OpenRouter",
  },
  { name: "npm-access-token", value: `npm_${pick(LOWER_ALNUM)(NPM_TOKEN)}7`, context: "npm" },
  {
    name: "slack-bot-token",
    value: `xoxb-${pick(DIGITS)(SLACK_TEAM)}-${pick(DIGITS)(SLACK_BOT)}-${mixed(ALNUM)(SLACK_SECRET)}`,
    context: "Slack",
  },
  { name: "stripe-access-token", value: `sk_live_${mixed(ALNUM)(STRIPE_KEY)}`, context: "Stripe" },
  { name: "aws-access-token", value: `AKIA${pick(UPPER_BASE32)(AWS_KEY)}`, context: "AWS" },
  { name: "gcp-api-key", value: `AIza${mixed(URL_SAFE)(GCP_KEY)}`, context: "Google" },
];

const bareSecrets = (): readonly FakeSecret[] => [
  {
    name: "cloudflare-api-token",
    value: mixed(URL_SAFE)(CLOUDFLARE_TOKEN),
    context: "cloudflare token",
  },
  { name: "bare-pasted-token", value: mixed(ALNUM)(PASTED_TOKEN), context: "これ使って" },
  {
    name: "watashi-token",
    value: `wat_${mixed(URL_SAFE)(WATASHI_TOKEN)}`,
    context: "WATASHI_TOKEN",
  },
];

const fakeSecrets: Effect.Effect<readonly FakeSecret[]> = Effect.all([jwt, privateKey]).pipe(
  Effect.map(([token, pem]) => [
    ...prefixedSecrets(),
    ...bareSecrets(),
    { name: "jwt", value: token, context: "Authorization: Bearer" },
    { name: "private-key", value: pem, context: "秘密鍵" },
  ]),
);

const githubToken = (): string => `ghp_${mixed(ALNUM)(GITHUB_PAT)}`;

const NON_SECRETS: readonly string[] = [
  "session_01vHd0ME4KuyZzvP1w9o0XmG",
  TOOL_USE_ID,
  "cmsg_01JV6n1Ceo5OrwXjQX1DZxpguMvPy1qPd0MPwJj4Za5R2k",
  "979820b5c0a7f3e2d1c4b6a8e9f0123456789abc",
  SESSION,
  "/home/user/masseater.dev/apps/watashi-mcp/src/features/mcp/api/endpoint.server.ts",
  "apps/watashi-mcp/src/features/mcp/api/conversation-writer.server.ts",
  "会話履歴を watashi-mcp に取り込む",
];

const plain = ({ value }: FakeSecret): Effect.Effect<string> => Effect.succeed(value);

const encoded = ({ value }: FakeSecret): Effect.Effect<string> =>
  Effect.succeed(Base64.encode(encoder.encode(`token=${value}`)));

const toolUse = (command: string): Json => ({
  role: "assistant",
  content: [{ type: "tool_use", id: TOOL_USE_ID, name: "Bash", input: { command } }],
});

const toolResult = (content: string): Json => ({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: TOOL_USE_ID, content }],
});

const userMessage: Placement = {
  name: "user message",
  line: ({ value, context }) =>
    encodeJson({
      type: "user",
      ...IDS,
      message: { role: "user", content: `${context} これ使って ${value} で叩いて` },
    }),
  needle: plain,
};

const PLACEMENTS: readonly Placement[] = [
  userMessage,
  {
    name: "Bash tool input",
    line: ({ value }) =>
      encodeJson({
        type: "assistant",
        ...IDS,
        message: toolUse(`export API_TOKEN='${value}' && curl -s https://example.com`),
      }),
    needle: plain,
  },
  {
    name: "multi-line tool result",
    line: ({ value }) =>
      encodeJson({
        type: "user",
        ...IDS,
        message: toolResult(`line one\nSECRET_TOKEN=${value}\nline three`),
      }),
    needle: plain,
  },
  {
    name: "JSON inside a string",
    line: ({ value }) =>
      encodeJson({ credentials: { token: value } }).pipe(
        Effect.flatMap((stdout) => encodeJson({ type: "user", ...IDS, toolUseResult: { stdout } })),
      ),
    needle: ({ value }) => encodeJson(value).pipe(Effect.map(Str.slice(ONE, -ONE))),
  },
  {
    name: "base64 encoded",
    line: (secret) =>
      encoded(secret).pipe(
        Effect.flatMap((text) =>
          encodeJson({
            type: "user",
            ...IDS,
            message: { role: "user", content: `encoded: ${text}` },
          }),
        ),
      ),
    needle: encoded,
  },
];

const nonSecretLine: Effect.Effect<string> = encodeJson({
  type: "assistant",
  ...IDS,
  message: { role: "assistant", content: Arr.join(NON_SECRETS, "\n") },
});

const imageLine = (data: string): Effect.Effect<string> =>
  encodeJson({
    type: "user",
    ...IDS,
    message: {
      role: "user",
      content: [{ type: "image", source: { type: "base64", media_type: "image/png", data } }],
    },
  });

const vendoredBetterleaks: Effect.Effect<string, never, Path.Path> = Effect.service(Path.Path).pipe(
  Effect.map((path) =>
    path.resolve(
      import.meta.dirname,
      "../../../node_modules/@r_masseater/vite-plus-adopt/vendor/betterleaks",
      BETTERLEAKS_VERSION,
      "betterleaks",
    ),
  ),
);

/** @internal */
export {
  ALNUM,
  NON_SECRETS,
  PLACEMENTS,
  fakeSecrets,
  githubToken,
  imageLine,
  nonSecretLine,
  pick,
  userMessage,
  vendoredBetterleaks,
};
/** @internal */
export type { FakeSecret, Placement };

import { Option, Schema, String as Str } from "effect";

const fireUrlPattern =
  /^https:\/\/api\.anthropic\.com\/v1\/claude_code\/routines\/trig_\w+\/fire$/u;

const FireSettingsSchema = Schema.Struct({
  fireUrl: Schema.String.check(Schema.isPattern(fireUrlPattern)),
  token: Schema.NonEmptyString,
});

type FireSettings = typeof FireSettingsSchema.Type;

type ScrapRequest = Readonly<{
  url: string;
  title: string;
  highlight: string;
  focus: string;
}>;

type FireResponse =
  | Readonly<{ status: "started"; sessionUrl: string }>
  | Readonly<{ status: "failed"; reason: string }>;

const FireSession = Schema.fromJsonString(
  Schema.Struct({ claude_code_session_url: Schema.String }),
);

const successStatus = 200;
const redirectStatus = 300;

const decodeSettings = (
  input: Readonly<{ fireUrl: string; token: string }>,
): Option.Option<FireSettings> =>
  Schema.decodeOption(FireSettingsSchema)({
    fireUrl: Str.trim(input.fireUrl),
    token: Str.trim(input.token),
  });

const fireHeaders = (settings: FireSettings): Readonly<Record<string, string>> => ({
  authorization: `Bearer ${settings.token}`,
  "anthropic-beta": "experimental-cc-routine-2026-04-01",
  "anthropic-version": "2023-06-01",
  "content-type": "application/json",
});

const fireBody = (request: ScrapRequest): string =>
  JSON.stringify({
    text: JSON.stringify({
      url: request.url,
      title: Str.trim(request.title),
      highlight: Str.trim(request.highlight),
      focus: Str.trim(request.focus),
    }),
  });

const fireResponse = (response: Readonly<{ status: number; text: string }>): FireResponse => {
  const failed: FireResponse = {
    status: "failed",
    reason: `HTTP ${String(response.status)}: ${response.text}`,
  };
  if (response.status < successStatus || response.status >= redirectStatus) {
    return failed;
  }
  return Option.match(Schema.decodeOption(FireSession)(response.text), {
    onNone: () => failed,
    onSome: (session): FireResponse => ({
      status: "started",
      sessionUrl: session.claude_code_session_url,
    }),
  });
};

export { decodeSettings, FireSettingsSchema, fireBody, fireHeaders, fireResponse };
export type { FireResponse, FireSettings, ScrapRequest };

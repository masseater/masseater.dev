import { Option, Schema, String as Str } from "effect";

type ScrapRequest = Readonly<{
  url: string;
  title: string;
  highlight: string;
  focus: string;
}>;

type RelayResponse =
  | Readonly<{ status: "started"; sessionUrl: string }>
  | Readonly<{ status: "login" }>
  | Readonly<{ status: "failed"; reason: string }>;

const relayUrl = "https://personal.masseater.dev/scrap-request";

const RelaySession = Schema.fromJsonString(Schema.Struct({ sessionUrl: Schema.String }));

const successStatus = 200;
const redirectStatus = 300;

const relayBody = (request: ScrapRequest): string =>
  JSON.stringify({
    url: request.url,
    title: Str.trim(request.title),
    highlight: Str.trim(request.highlight),
    focus: Str.trim(request.focus),
  });

const relayResponse = (
  response: Readonly<{ status: number; finalUrl: string; text: string }>,
): RelayResponse => {
  if (response.finalUrl !== relayUrl) {
    return { status: "login" };
  }
  const failed: RelayResponse = {
    status: "failed",
    reason: `HTTP ${String(response.status)}: ${response.text}`,
  };
  if (response.status < successStatus || response.status >= redirectStatus) {
    return failed;
  }
  return Option.match(Schema.decodeOption(RelaySession)(response.text), {
    onNone: () => failed,
    onSome: (session): RelayResponse => ({ status: "started", sessionUrl: session.sessionUrl }),
  });
};

export { relayBody, relayResponse, relayUrl };
export type { RelayResponse, ScrapRequest };

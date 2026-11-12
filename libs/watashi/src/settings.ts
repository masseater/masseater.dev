import { CONVERSATION_SOURCES, SITE_ORIGIN } from "@masseater.dev/watashi-protocol";
import type { ConversationSource } from "@masseater.dev/watashi-protocol";
import { Config, String as Str } from "effect";
import type { Option, Redacted } from "effect";

type Settings = Readonly<{
  url: string;
  home: string;
  token: Option.Option<Redacted.Redacted>;
  send: boolean;
  source: ConversationSource;
  remoteSession: string;
  betterleaks: Option.Option<string>;
}>;

const [LOCAL, CLOUD] = CONVERSATION_SOURCES;

const sourceOf = (remote: string): ConversationSource => {
  if (remote === "true") {
    return CLOUD;
  }
  return LOCAL;
};

const userHome = Config.String("HOME").pipe(Config.orElse(() => Config.String("USERPROFILE")));

const configDirectory = Config.String("XDG_CONFIG_HOME").pipe(
  Config.orElse(() => userHome.pipe(Config.map((directory) => `${directory}/.config`))),
);

const home = Config.String("WATASHI_HOME").pipe(
  Config.orElse(() => configDirectory.pipe(Config.map((directory) => `${directory}/watashi`))),
);

const url = Config.String("WATASHI_URL").pipe(
  Config.withDefault(SITE_ORIGIN),
  Config.map(Str.replace(/\/+$/u, "")),
);

const settings: Config.Config<Settings> = Config.all({
  url,
  home,
  token: Config.option(Config.Redacted("WATASHI_TOKEN")),
  send: Config.Boolean("WATASHI_SEND_CONVERSATIONS").pipe(Config.withDefault(false)),
  source: Config.String("CLAUDE_CODE_REMOTE").pipe(Config.withDefault(""), Config.map(sourceOf)),
  remoteSession: Config.String("CLAUDE_CODE_REMOTE_SESSION_ID").pipe(Config.withDefault("")),
  betterleaks: Config.option(Config.String("WATASHI_BETTERLEAKS")),
});

/** @internal */
export { settings };
/** @internal */
export type { Settings };

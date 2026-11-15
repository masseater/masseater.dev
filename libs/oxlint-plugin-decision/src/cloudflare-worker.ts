import { endpointOf, sendChat } from "./cloudflare-chat.ts";
import { serveDecisions } from "./serve-decisions.ts";
import { mergeYesNo, yesNoRequestFor } from "./wire.ts";

serveDecisions({
  endpoint: endpointOf,
  wires: yesNoRequestFor,
  combine: mergeYesNo,
  send: sendChat,
});

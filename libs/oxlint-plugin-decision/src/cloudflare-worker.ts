import { endpointOf, sendChat } from "./cloudflare-chat.ts";
import { serveDecisions } from "./serve-decisions.ts";
import { mergeYesNo, yesNoRequestsFor } from "./wire.ts";

serveDecisions({
  endpoint: endpointOf,
  wires: yesNoRequestsFor,
  combine: mergeYesNo,
  send: sendChat,
});

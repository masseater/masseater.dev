import { mergeYesNo, yesNoRequestFor } from "#/entities/decision/index.ts";
import { endpointOf, sendChat, serveDecisions } from "#/features/serve-decisions/index.ts";

serveDecisions({
  endpoint: endpointOf,
  wires: yesNoRequestFor,
  combine: mergeYesNo,
  send: sendChat,
});

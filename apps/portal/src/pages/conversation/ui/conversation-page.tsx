import type { ReactNode } from "react";

import { useConversation } from "#/pages/conversation/api/conversation-query";

import { MoreSlot } from "./more-slot";
import { UtteranceList } from "./utterance-list";

const ConversationPage = (): ReactNode => {
  const conversation = useConversation();
  return (
    <article className="flex flex-col gap-6">
      <h1 className="text-foreground/50 font-mono text-xs break-all">{conversation.sessionId}</h1>
      <UtteranceList utterances={conversation.utterances} />
      <MoreSlot conversation={conversation} />
    </article>
  );
};

export { ConversationPage };

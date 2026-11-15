import type { ReactNode } from "react";

import { MoreSlot } from "#/features/page-utterances";
import { useConversation } from "#/pages/conversation/api/conversation-query";

import { UtteranceList } from "./utterance-list";

export const ConversationPage = (): ReactNode => {
  const conversation = useConversation();
  return (
    <article className="flex flex-col gap-6">
      <h1 className="text-foreground/50 font-mono text-xs break-all">{conversation.sessionId}</h1>
      <UtteranceList utterances={conversation.utterances} />
      <MoreSlot conversation={conversation} />
    </article>
  );
};

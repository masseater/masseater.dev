import type { ReactNode } from "react";

import { MoreSlot } from "#/features/page-utterances/index.ts";
import { useConversation } from "#/pages/conversation/api/conversation-query.ts";
import { Section } from "#/shared/ui/index.ts";

import { UtteranceList } from "./utterance-list.tsx";

const TITLE = "会話";

export const ConversationPage = (): ReactNode => {
  const conversation = useConversation();
  return (
    <Section meta={conversation.sessionId} title={TITLE}>
      <UtteranceList utterances={conversation.utterances} />
      <MoreSlot conversation={conversation} />
    </Section>
  );
};

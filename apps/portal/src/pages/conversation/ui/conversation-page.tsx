import type { ReactNode } from "react";

import { useConversation } from "#/pages/conversation/api/conversation-query";
import { Section } from "#/shared/ui";

import { MoreSlot } from "./more-slot";
import { UtteranceList } from "./utterance-list";

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

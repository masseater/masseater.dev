import { Option } from "effect";
import type { ReactNode } from "react";

import type { ConversationValue } from "#/entities/watashi";

import { MoreLink } from "./more-link";

const MoreSlot = ({ conversation }: Readonly<{ conversation: ConversationValue }>): ReactNode =>
  Option.match(Option.fromUndefinedOr(conversation.nextCursor), {
    onNone: () => false,
    onSome: (cursor) => <MoreLink cursor={cursor} sessionId={conversation.sessionId} />,
  });

export { MoreSlot };

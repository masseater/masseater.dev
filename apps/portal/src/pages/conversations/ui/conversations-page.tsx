import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useSessions } from "#/pages/conversations/api/sessions-query";
import { RowList } from "#/shared/ui";

import { SessionRow } from "./session-row";

const LABEL = "Claude Code の会話";

const ConversationsPage = (): ReactNode => (
  <RowList label={LABEL}>
    {pipe(
      useSessions(),
      Arr.map((session) => <SessionRow key={session.sessionId} session={session} />),
    )}
  </RowList>
);

export { ConversationsPage };

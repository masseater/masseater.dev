import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useSessions } from "#/pages/conversations/api/sessions-query.ts";
import { RowList, Section } from "#/shared/ui/index.ts";

import { SessionRow } from "./session-row";

const LABEL = "Claude Code の会話";

export const ConversationsPage = (): ReactNode => (
  <Section title={LABEL}>
    <RowList label={LABEL}>
      {pipe(
        useSessions(),
        Arr.map((session) => <SessionRow key={session.sessionId} session={session} />),
      )}
    </RowList>
  </Section>
);

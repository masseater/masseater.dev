import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { placeOf, sizeOf } from "#/entities/watashi/index.ts";
import type { SessionValue } from "#/entities/watashi/index.ts";
import { jstMinute } from "#/shared/model/index.ts";
import { Row, TagList } from "#/shared/ui/index.ts";

export const SessionRow = ({ session }: Readonly<{ session: SessionValue }>): ReactNode => {
  const params = useMemo(() => ({ session: session.sessionId }), [session.sessionId]);
  const tags = useMemo(() => [session.source, sizeOf(session)], [session]);
  return (
    <Row lead={jstMinute(session.lastAt)}>
      <Link
        className="text-link font-bold break-all underline underline-offset-3"
        params={params}
        to="/conversations/$session"
      >
        {placeOf(session)}
      </Link>
      <p className="text-muted-foreground font-mono text-xs break-all">{session.cwd}</p>
      <TagList tags={tags} />
    </Row>
  );
};

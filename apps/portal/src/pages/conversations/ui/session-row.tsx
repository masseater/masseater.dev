import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { placeOf, sizeOf } from "#/entities/watashi";
import type { SessionValue } from "#/entities/watashi";
import { jstMinute } from "#/shared/model";
import { Row, TagList } from "#/shared/ui";

const SessionRow = ({ session }: Readonly<{ session: SessionValue }>): ReactNode => {
  const params = useMemo(() => ({ session: session.sessionId }), [session.sessionId]);
  const tags = useMemo(() => [session.source, sizeOf(session)], [session]);
  return (
    <Row lead={jstMinute(session.lastAt)}>
      <Link
        className="font-display hover:text-foreground/70 text-lg font-light break-all transition-colors"
        params={params}
        to="/conversations/$session"
      >
        {placeOf(session)}
      </Link>
      <p className="text-foreground/50 font-mono text-xs break-all">{session.cwd}</p>
      <TagList tags={tags} />
    </Row>
  );
};

export { SessionRow };

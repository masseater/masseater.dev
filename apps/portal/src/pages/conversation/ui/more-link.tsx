import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

const MORE = "続き";

const MoreLink = ({
  cursor,
  sessionId,
}: Readonly<{ cursor: number; sessionId: string }>): ReactNode => {
  const params = useMemo(() => ({ session: sessionId }), [sessionId]);
  const search = useMemo(() => ({ cursor }), [cursor]);
  return (
    <Link
      className="stage-link self-end"
      params={params}
      search={search}
      to="/conversations/$session"
    >
      {MORE}
    </Link>
  );
};

export { MoreLink };

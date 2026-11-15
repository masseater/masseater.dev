import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

const MORE = "続き";

export const MoreLink = ({
  cursor,
  sessionId,
}: Readonly<{ cursor: number; sessionId: string }>): ReactNode => {
  const params = useMemo(() => ({ session: sessionId }), [sessionId]);
  const search = useMemo(() => ({ cursor }), [cursor]);
  return (
    <Link
      className="text-link self-end underline underline-offset-3"
      params={params}
      search={search}
      to="/conversations/$session"
    >
      {MORE}
    </Link>
  );
};

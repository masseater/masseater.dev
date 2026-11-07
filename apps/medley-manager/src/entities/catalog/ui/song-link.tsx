import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

const SongLink = ({ id, title }: Readonly<{ id: number; title: string }>): ReactNode => {
  const params = useMemo(() => ({ id }), [id]);
  return (
    <Link to="/songs/$id" params={params} className="hover:underline">
      {title}
    </Link>
  );
};

export { SongLink };

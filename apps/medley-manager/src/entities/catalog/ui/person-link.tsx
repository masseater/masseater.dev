import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

const PersonLink = ({ id, name }: Readonly<{ id: number; name: string }>): ReactNode => {
  const params = useMemo(() => ({ id }), [id]);
  return (
    <Link to="/people/$id" params={params} className="hover:underline">
      {name}
    </Link>
  );
};

export { PersonLink };

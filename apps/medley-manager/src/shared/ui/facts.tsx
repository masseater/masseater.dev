import { Array, pipe } from "effect";
import type { ReactNode } from "react";

const SEPARATOR = "・";

const Facts = ({ values }: Readonly<{ values: readonly (string | null)[] }>): ReactNode => {
  const facts = pipe(
    values,
    Array.filter((value): value is string => value !== null && value !== ""),
    Array.join(SEPARATOR),
  );
  return facts !== "" && <p className="text-muted-foreground">{facts}</p>;
};

export { Facts };

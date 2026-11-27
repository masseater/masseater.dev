import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

export const ListView = ({ items }: Readonly<{ items: readonly string[] }>): ReactNode => (
  <ul className="flex list-disc flex-col gap-0.5 pl-5">
    {pipe(
      items,
      Arr.map((item) => <li key={item}>{item}</li>),
    )}
  </ul>
);

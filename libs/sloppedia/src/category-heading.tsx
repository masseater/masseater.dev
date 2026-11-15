import type { ReactNode } from "react";

export const CategoryHeading = ({
  name,
  count,
}: Readonly<{ name: string; count: string }>): ReactNode => (
  <h2 className="border-wiki-divider border-b pb-1 font-serif text-lg">
    {name}
    <span className="text-wiki-subtle ms-2 font-sans text-xs">{count}</span>
  </h2>
);

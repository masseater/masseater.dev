import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

const AboutItemList = ({ items }: Readonly<{ items: readonly string[] }>): ReactNode => (
  <ul className="flex flex-col gap-2">
    {pipe(
      items,
      Arr.map((item) => <li key={item}>{item}</li>),
    )}
  </ul>
);

export { AboutItemList };

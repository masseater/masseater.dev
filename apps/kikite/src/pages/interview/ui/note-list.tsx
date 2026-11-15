import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

export const NoteList = ({
  items,
  empty,
}: Readonly<{ items: readonly string[]; empty: string }>): ReactNode => {
  if (Arr.isReadonlyArrayEmpty(items)) {
    return <p className="text-muted-foreground/70 text-sm">{empty}</p>;
  }
  return (
    <ul className="marker:text-muted-foreground flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed">
      {pipe(
        items,
        Arr.map((item) => (
          <li key={item} className="animate-in fade-in wrap-anywhere duration-700">
            {item}
          </li>
        )),
      )}
    </ul>
  );
};

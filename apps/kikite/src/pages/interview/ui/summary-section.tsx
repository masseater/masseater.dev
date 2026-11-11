import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

const SummarySection = ({
  title,
  items,
}: Readonly<{ title: string; items: readonly string[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(items) && (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-muted-foreground text-xs font-medium">{title}</h3>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
        {pipe(
          items,
          Arr.map((item) => <li key={item}>{item}</li>),
        )}
      </ul>
    </section>
  );

export { SummarySection };

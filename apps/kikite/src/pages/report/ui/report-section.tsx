import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

export const ReportSection = ({
  heading,
  items,
}: Readonly<{ heading: string; items: readonly string[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(items) && (
    <section className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-sm font-semibold">{heading}</h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">
        {pipe(
          items,
          Arr.map((item) => <li key={item}>{item}</li>),
        )}
      </ul>
    </section>
  );

import { DateTime } from "effect";
import type { ReactNode } from "react";

const UpdatedNote = ({
  label,
  locale,
  date,
}: Readonly<{ label: string; locale: string; date: string }>): ReactNode => (
  <p className="text-wiki-subtle mt-4 flex gap-1 text-xs">
    {label}
    <time dateTime={date}>
      {DateTime.formatUtc(DateTime.makeUnsafe(date), { locale, dateStyle: "long" })}
    </time>
  </p>
);

export { UpdatedNote };

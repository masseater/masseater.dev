import { Option } from "effect";
import type { ReactNode } from "react";

const CountBadge = ({ count }: Readonly<{ count: number | undefined }>): ReactNode =>
  Option.match(Option.fromUndefinedOr(count), {
    onNone: () => false,
    onSome: (value) => (
      <span className="bg-secondary rounded-full px-2.5 py-0.5 font-sans text-sm font-bold tabular-nums">
        {value}
      </span>
    ),
  });

export { CountBadge };

import { Option } from "effect";
import type { ReactNode } from "react";

const STAR = "☆";

const STAR_LABEL = "スター";

const PENDING_COUNT = 0;

const EntryStars = ({ count }: Readonly<{ count: number | undefined }>): ReactNode => {
  const loaded = Option.fromUndefinedOr(count);
  return (
    <span
      aria-hidden={Option.isNone(loaded)}
      className="text-foreground/70 font-display flex items-center gap-1 text-xs tabular-nums aria-hidden:invisible"
    >
      <span aria-hidden>{STAR}</span>
      <span className="sr-only">{STAR_LABEL}</span>
      {Option.getOrElse(loaded, () => PENDING_COUNT)}
    </span>
  );
};

export { EntryStars };

import { useCallback } from "react";
import type { ReactNode } from "react";

const STAR_LABEL = "スター";

const STARRED = "★";

const UNSTARRED = "☆";

const StarToggle = ({
  count,
  starred,
  addStar,
  removeStar,
}: Readonly<{
  count: number;
  starred: boolean;
  addStar: () => void;
  removeStar: () => void;
}>): ReactNode => {
  const onClick = useCallback(() => {
    if (starred) {
      removeStar();
      return;
    }
    addStar();
  }, [starred, addStar, removeStar]);
  return (
    <button
      aria-label={STAR_LABEL}
      aria-pressed={starred}
      className="glass-surface hover:bg-background/60 hover:text-foreground focus-visible:text-foreground aria-pressed:text-foreground flex aspect-square size-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-full leading-none transition-colors"
      onClick={onClick}
      type="button"
    >
      <span aria-hidden className="text-base">
        {starred && STARRED}
        {!starred && UNSTARRED}
      </span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
};

export { StarToggle };

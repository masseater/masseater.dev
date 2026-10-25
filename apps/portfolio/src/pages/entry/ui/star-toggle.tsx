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
      className="glass-surface hover:bg-background/60 hover:text-foreground focus-visible:text-foreground aria-pressed:text-foreground flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors"
      onClick={onClick}
      type="button"
    >
      <span aria-hidden>
        {starred && STARRED}
        {!starred && UNSTARRED}
      </span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
};

export { StarToggle };

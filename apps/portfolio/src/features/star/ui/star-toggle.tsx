import { useCallback } from "react";
import type { ReactNode } from "react";

import type { StarView } from "#/features/star/model/star-state";

const STAR_LABEL = "スター";

const STARRED = "★";

const UNSTARRED = "☆";

const COUNT_CLASS = {
  pending: "tabular-nums invisible",
  found: "tabular-nums",
} as const;

const StarToggle = ({
  view,
  addStar,
  removeStar,
}: Readonly<{
  view: StarView;
  addStar: () => void;
  removeStar: () => void;
}>): ReactNode => {
  const starred = view.status === "found" && view.starred;
  const onClick = useCallback(() => {
    if (starred) {
      removeStar();
      return;
    }
    addStar();
  }, [starred, addStar, removeStar]);
  return (
    <button
      aria-busy={view.status === "pending"}
      aria-label={STAR_LABEL}
      aria-pressed={starred}
      className="glass-surface hover:bg-background/60 hover:text-foreground focus-visible:text-foreground aria-pressed:text-foreground flex aspect-square size-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-full leading-none transition-colors disabled:cursor-default"
      disabled={view.status === "pending"}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden className="text-base">
        {starred && STARRED}
        {!starred && UNSTARRED}
      </span>
      <span className={COUNT_CLASS[view.status]}>{view.count}</span>
    </button>
  );
};

export { StarToggle };

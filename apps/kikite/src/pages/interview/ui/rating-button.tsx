import { Button } from "@masseater.dev/ui/button";
import { cn } from "@masseater.dev/ui/cn";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback } from "react";

import { useRate } from "#/pages/interview/model/review-hooks";
import type { Rating } from "#/pages/interview/model/review-hooks";

const LOOKS = {
  good: { Icon: ThumbsUp, label: "聞いてほしかった" },
  off: { Icon: ThumbsDown, label: "ずれている" },
} as const;

const RatingButton = ({
  id,
  current,
  value,
}: Readonly<{ id: number; current: Rating; value: "good" | "off" }>): ReactNode => {
  const rate = useRate(id);
  const onClick = useCallback(() => {
    rate(value);
  }, [rate, value]);
  const { Icon, label } = LOOKS[value];
  const active = current === value;
  return (
    <Button
      variant="ghost"
      className={cn("text-muted-foreground/60", active && "text-foreground")}
      size="icon-xs"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      <Icon />
    </Button>
  );
};

export { RatingButton };

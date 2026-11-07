import { cn } from "@masseater.dev/ui/cn";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import { useStatus } from "#/shared/api";

const SIZES = {
  xs: { text: "text-xs", icon: "size-4" },
  sm: { text: "text-sm", icon: "size-5" },
} as const;

const IndexingProgress = ({ size }: Readonly<{ size: keyof typeof SIZES }>): ReactNode => {
  const status = useStatus();
  if (!status.isSuccess || !status.data.indexing) {
    return false;
  }
  const { done, total } = status.data.step;
  return (
    <p
      className={cn("text-muted-foreground flex items-center gap-2 tabular-nums", SIZES[size].text)}
    >
      <LoaderCircle aria-hidden className={cn("animate-spin", SIZES[size].icon)} />
      {`${done.toString()} / ${total.toString()}`}
    </p>
  );
};

export { IndexingProgress };

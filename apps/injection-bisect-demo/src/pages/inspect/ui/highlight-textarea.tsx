import { cn } from "@masseater.dev/web-ui";
import type { ChangeEventHandler, ReactNode } from "react";

const LAYER =
  "col-start-1 row-start-1 min-h-40 w-full rounded-md border px-3 py-2 text-base leading-relaxed break-words whitespace-pre-wrap md:text-sm";

const HighlightTextarea = ({
  children,
  maxLength,
  value,
  onChange,
}: Readonly<{
  children: ReactNode;
  maxLength: number;
  value: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
}>): ReactNode => (
  <div data-slot="highlight-textarea" className="grid">
    <div aria-hidden="true" className={cn(LAYER, "border-transparent text-transparent")}>
      {children}{" "}
    </div>
    <textarea
      className={cn(
        LAYER,
        "resize-none overflow-hidden border-input bg-transparent shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
      )}
      maxLength={maxLength}
      value={value}
      onChange={onChange}
    />
  </div>
);

export { HighlightTextarea };

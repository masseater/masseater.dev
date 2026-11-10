import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

import { useTranslation } from "#/pages/translator/api/translation.ts";

const PLACEHOLDER = "翻訳";

const TRANSLATING = "翻訳しています...";

const OutputText = (): ReactNode => {
  const output = useTranslation();
  if (output.status === "empty") {
    return <span className="text-muted-foreground">{PLACEHOLDER}</span>;
  }
  if (output.status === "translating") {
    return <span className="text-muted-foreground">{TRANSLATING}</span>;
  }
  if (output.status === "failed") {
    return <span className="text-destructive text-base">{output.message}</span>;
  }
  return <span className={cn(output.stale && "text-muted-foreground")}>{output.text}</span>;
};

export { OutputText };

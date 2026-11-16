import { Button } from "@masseater.dev/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useSelect, useSource } from "#/entities/language/index.ts";
import { useDirection, useTranslation, useSetDraft } from "#/entities/translation/index.ts";
import { swapped } from "#/features/swap-languages/model/swap.ts";

const LABEL = "言語を入れ替える";

export const SwapButton = (): ReactNode => {
  const source = useSource();
  const direction = useDirection();
  const output = useTranslation();
  const select = useSelect();
  const setDraft = useSetDraft();
  const onClick = useCallback(() => {
    select(swapped({ source, direction }));
    if (output.status === "translated") {
      setDraft(output.text);
    }
  }, [direction, output, select, setDraft, source]);
  return (
    <Button
      aria-label={LABEL}
      className="mx-2 rounded-full"
      size="icon"
      variant="ghost"
      onClick={onClick}
    >
      <ArrowLeftRight className="size-5" />
    </Button>
  );
};

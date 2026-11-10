import { Button } from "@masseater.dev/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useDirection, useTranslation } from "#/pages/translator/api/translation.ts";
import { useSetDraft } from "#/pages/translator/model/draft.ts";
import { useSelect, useSource } from "#/pages/translator/model/selection.ts";
import { swapped } from "#/pages/translator/model/swap";

const LABEL = "言語を入れ替える";

const SwapButton = (): ReactNode => {
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

export { SwapButton };

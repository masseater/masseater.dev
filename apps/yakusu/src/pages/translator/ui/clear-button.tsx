import { Button } from "@masseater.dev/ui/button";
import { X } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useDraft, useSetDraft } from "#/pages/translator/model/draft.ts";

const LABEL = "消去";

const ClearButton = (): ReactNode => {
  const draft = useDraft();
  const setDraft = useSetDraft();
  const onClick = useCallback(() => {
    setDraft("");
  }, [setDraft]);
  if (draft === "") {
    return false;
  }
  return (
    <Button
      aria-label={LABEL}
      className="absolute top-3 right-3 rounded-full"
      size="icon"
      variant="ghost"
      onClick={onClick}
    >
      <X className="size-6" />
    </Button>
  );
};

export { ClearButton };

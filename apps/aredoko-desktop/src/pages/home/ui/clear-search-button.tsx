import { Button } from "@masseater.dev/ui/button";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { useClearSearch, useDraft, useQueryText } from "#/pages/home/model";

const LABEL = "検索をやめる";

const ClearSearchButton = (): ReactNode => {
  const clear = useClearSearch();
  const draft = useDraft();
  const query = useQueryText();
  if (draft === "" && query === "") {
    return false;
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={LABEL}
      title={LABEL}
      onClick={clear}
    >
      <X />
    </Button>
  );
};

export { ClearSearchButton };

import { Button } from "@masseater.dev/ui/button";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useTranslation } from "#/pages/translator/api/translation.ts";
import { useCopyText } from "#/pages/translator/model/copy.ts";

import { CopyIcon } from "./copy-icon.tsx";

const LABEL = "翻訳をコピー";

const CopyButton = (): ReactNode => {
  const output = useTranslation();
  const copyText = useCopyText();
  const onClick = useCallback(() => {
    if (output.status === "translated") {
      copyText(output.text);
    }
  }, [copyText, output]);
  if (output.status !== "translated") {
    return false;
  }
  return (
    <Button
      aria-label={LABEL}
      className="ml-auto rounded-full"
      size="icon"
      variant="ghost"
      onClick={onClick}
    >
      <CopyIcon />
    </Button>
  );
};

export { CopyButton };

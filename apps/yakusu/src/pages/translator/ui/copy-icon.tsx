import { Check, Copy } from "lucide-react";
import type { ReactNode } from "react";

import { useCopy } from "#/pages/translator/model/copy.ts";

const CopyIcon = (): ReactNode => {
  if (useCopy() === "copied") {
    return <Check className="size-5" />;
  }
  return <Copy className="size-5" />;
};

export { CopyIcon };

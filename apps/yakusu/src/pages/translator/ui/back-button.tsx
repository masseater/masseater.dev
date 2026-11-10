import { Button } from "@masseater.dev/ui/button";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { useClosePicker } from "#/pages/translator/model/search.ts";

const LABEL = "戻る";

const BackButton = (): ReactNode => (
  <Button
    aria-label={LABEL}
    className="rounded-full"
    size="icon"
    variant="ghost"
    onClick={useClosePicker()}
  >
    <ArrowLeft className="size-5" />
  </Button>
);

export { BackButton };

import { Button } from "@masseater.dev/ui/button";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { useClosePicker } from "#/features/choose-language/model/search";

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

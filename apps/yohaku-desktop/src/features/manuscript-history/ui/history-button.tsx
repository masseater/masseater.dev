import { Button } from "@masseater.dev/ui/button";
import { History } from "lucide-react";
import type { ReactNode } from "react";

const LABEL = "履歴";

export const HistoryButton = ({
  open,
  toggle,
}: Readonly<{ open: boolean; toggle: () => void }>): ReactNode => (
  <Button
    aria-expanded={open}
    aria-label={LABEL}
    size="icon-sm"
    title={LABEL}
    variant="ghost"
    onClick={toggle}
  >
    <History aria-hidden="true" />
  </Button>
);

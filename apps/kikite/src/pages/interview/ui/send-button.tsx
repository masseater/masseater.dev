import { Button } from "@masseater.dev/ui/button";
import { ArrowUp } from "lucide-react";
import type { ReactNode } from "react";

const LABEL = "送る";

const variantOf = (empty: boolean): "ghost" | "default" => {
  if (empty) {
    return "ghost";
  }
  return "default";
};

const SendButton = ({ empty }: Readonly<{ empty: boolean }>): ReactNode => (
  <Button
    type="submit"
    size="icon"
    variant={variantOf(empty)}
    className="rounded-full"
    aria-label={LABEL}
    title={LABEL}
    disabled={empty}
  >
    <ArrowUp />
  </Button>
);

export { SendButton };

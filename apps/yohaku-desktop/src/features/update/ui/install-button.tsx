import { Button } from "@masseater.dev/ui/button";
import { RotateCw } from "lucide-react";
import type { ReactNode } from "react";

const LABEL = "更新して再起動";
const RETRY = "更新をやり直す";

type Props = Readonly<{ failed: boolean; install: () => void }>;

const labelOf = (failed: boolean): string => {
  if (failed) {
    return RETRY;
  }
  return LABEL;
};

const InstallButton = ({ failed, install }: Props): ReactNode => (
  <Button size="sm" onClick={install}>
    <RotateCw aria-hidden="true" />
    {labelOf(failed)}
  </Button>
);

export { InstallButton };

import { Button } from "@masseater.dev/ui/button";
import { RotateCw } from "lucide-react";
import type { ReactNode } from "react";

type Recheck = Readonly<{ checking: boolean; recheck: () => void }>;

const LABEL = "確かめる";

const RecheckButton = ({ checking, recheck }: Recheck): ReactNode => (
  <Button disabled={checking} size="sm" variant="ghost" onClick={recheck}>
    <RotateCw aria-hidden="true" />
    {LABEL}
  </Button>
);

export { RecheckButton };
export type { Recheck };

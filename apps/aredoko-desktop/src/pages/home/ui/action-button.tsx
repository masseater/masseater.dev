import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

const ActionButton = ({
  onClick,
  children,
}: Readonly<{ onClick: () => void; children: ReactNode }>): ReactNode => (
  <Button variant="outline" size="sm" className="self-start" onClick={onClick}>
    {children}
  </Button>
);

export { ActionButton };

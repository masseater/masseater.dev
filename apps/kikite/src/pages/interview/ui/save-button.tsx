import { Button } from "@masseater.dev/ui/button";
import { Download } from "lucide-react";
import type { ReactNode } from "react";

import { useWithSession } from "#/pages/interview/model/hooks";
import type { Session } from "#/pages/interview/model/hooks";

const LABEL = "記録を保存";

const save = (session: Session): void => {
  session.save();
};

const SaveButton = (): ReactNode => {
  const onClick = useWithSession(save);
  return (
    <Button variant="ghost" size="icon-sm" aria-label={LABEL} title={LABEL} onClick={onClick}>
      <Download />
    </Button>
  );
};

export { SaveButton };

import { Button } from "@masseater.dev/ui/button";
import { PenLine } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { NEW_MANUSCRIPT, opened, useScreen } from "#/shared/model";

const LABEL = "新しく書く";

const NewManuscriptButton = (): ReactNode => {
  const [screen, setScreen] = useScreen();
  const onClick = useCallback(() => {
    setScreen(opened(NEW_MANUSCRIPT)(screen));
  }, [screen, setScreen]);
  return (
    <Button className="self-start" onClick={onClick}>
      <PenLine aria-hidden="true" />
      {LABEL}
    </Button>
  );
};

export { NewManuscriptButton };

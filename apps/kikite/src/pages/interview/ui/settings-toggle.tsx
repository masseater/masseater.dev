import { Button } from "@masseater.dev/ui/button";
import { Settings2 } from "lucide-react";
import type { ReactNode } from "react";

import { useSettingsOpen, useToggleSettings } from "#/pages/interview/model/hooks";

const LABEL = "設定";

const SettingsToggle = (): ReactNode => {
  const open = useSettingsOpen();
  const onClick = useToggleSettings();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={LABEL}
      title={LABEL}
      aria-pressed={open}
      onClick={onClick}
    >
      <Settings2 />
    </Button>
  );
};

export { SettingsToggle };

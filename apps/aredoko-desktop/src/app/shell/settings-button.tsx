import { Button } from "@masseater.dev/ui/button";
import { Settings } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useOpenPage, usePage } from "./navigation.ts";

const LABEL = "設定";

const variantOf = (open: boolean): "secondary" | "ghost" => {
  if (open) {
    return "secondary";
  }
  return "ghost";
};

const SettingsButton = (): ReactNode => {
  const open = usePage() === "settings";
  const openPage = useOpenPage();
  const toggle = useCallback(() => {
    if (open) {
      openPage("home");
      return;
    }
    openPage("settings");
  }, [open, openPage]);
  return (
    <Button
      variant={variantOf(open)}
      size="icon"
      aria-label={LABEL}
      aria-pressed={open}
      title={LABEL}
      onClick={toggle}
    >
      <Settings />
    </Button>
  );
};

export { SettingsButton };

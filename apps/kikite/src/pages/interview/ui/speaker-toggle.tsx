import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

import { useToggleVoice, useVoiceOn } from "#/pages/interview/model/hooks";

import { SpeakerIcon } from "./speaker-icon.tsx";

const LABEL = "読み上げ";

const SpeakerToggle = (): ReactNode => {
  const on = useVoiceOn();
  const onClick = useToggleVoice();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={LABEL}
      aria-pressed={on}
      title={LABEL}
      onClick={onClick}
    >
      <SpeakerIcon on={on} />
    </Button>
  );
};

export { SpeakerToggle };

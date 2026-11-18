import { Array as Arr } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useMix, useSwitch } from "#/features/play-stems/model/mix.ts";
import type { Switch } from "#/features/play-stems/model/mix.ts";
import { LABELS } from "#/shared/config/index.ts";

const TEXT: Readonly<Record<Switch, Readonly<{ mark: string; name: string }>>> = {
  soloed: { mark: LABELS.solo, name: LABELS.soloOf },
  muted: { mark: LABELS.mute, name: LABELS.muteOf },
};

export const SwitchButton = ({
  stem,
  which,
}: Readonly<{ stem: string; which: Switch }>): ReactNode => {
  const mix = useMix();
  const flip = useSwitch(which);
  const handleClick = useCallback(() => {
    flip(stem);
  }, [flip, stem]);
  return (
    <button
      type="button"
      aria-pressed={Arr.contains(mix[which], stem)}
      aria-label={`${stem} ${TEXT[which].name}`}
      onClick={handleClick}
      className="aria-pressed:bg-foreground aria-pressed:text-background size-8 rounded-md border text-xs"
    >
      {TEXT[which].mark}
    </button>
  );
};

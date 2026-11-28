import { BrowserHost } from "@effect/ui/html";
import { EffectIsland } from "@masseater.dev/effect-ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { PasskeyKind } from "./passkey-panel-message.ts";
import { PasskeyPanel } from "./passkey-panel.ts";

export const PasskeyScreen = ({
  kind,
  title,
  label,
  done,
  failed,
}: Readonly<{
  kind: typeof PasskeyKind.Type;
  title: string;
  label: string;
  done: string;
  failed: string;
}>): ReactNode => {
  const mount = useCallback(
    (container: HTMLElement) =>
      BrowserHost.mount(PasskeyPanel, { kind, title, label, done, failed }, container),
    [kind, title, label, done, failed],
  );
  return <EffectIsland mount={mount} />;
};

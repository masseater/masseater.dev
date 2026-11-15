import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useInstall } from "#/features/update/api/update.ts";

import { InstallButton } from "./install-button.tsx";
import { InstallProgress } from "./install-progress.tsx";

export const UpdateAction = (): ReactNode => {
  const { install, progress, failed } = useInstall();
  return pipe(
    progress,
    Option.match({
      onSome: (done) => <InstallProgress done={done} />,
      onNone: () => <InstallButton failed={failed} install={install} />,
    }),
  );
};

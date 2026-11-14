import type { ReactNode } from "react";

import { InstallButton } from "./install-button.tsx";
import { RecheckButton } from "./recheck-button.tsx";
import type { Recheck } from "./recheck-button.tsx";

const LABEL = "見つかりません";

const ClaudeMissing = ({ checking, recheck }: Recheck): ReactNode => (
  <>
    <span className="text-muted-foreground">{LABEL}</span>
    <InstallButton />
    <RecheckButton checking={checking} recheck={recheck} />
  </>
);

export { ClaudeMissing };

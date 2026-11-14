import type { ReactNode } from "react";

import { CopyLoginButton, LOGIN } from "./copy-login-button.tsx";
import { RecheckButton } from "./recheck-button.tsx";
import type { Recheck } from "./recheck-button.tsx";

const ClaudeLoggedOut = ({ checking, recheck }: Recheck): ReactNode => (
  <>
    <code className="rounded-sm border px-2 py-0.5 font-mono text-xs">{LOGIN}</code>
    <CopyLoginButton />
    <RecheckButton checking={checking} recheck={recheck} />
  </>
);

export { ClaudeLoggedOut };

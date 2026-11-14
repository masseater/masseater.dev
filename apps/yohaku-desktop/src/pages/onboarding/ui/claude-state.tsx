import { Option } from "effect";
import type { ReactNode } from "react";

import { useClaudeStatus } from "#/entities/onboarding";

import { ClaudeLoggedOut } from "./claude-logged-out.tsx";
import { ClaudeMissing } from "./claude-missing.tsx";
import { ClaudeReady } from "./claude-ready.tsx";

const CHECKING = "確かめています";

const ClaudeState = (): ReactNode => {
  const { status, checking, recheck } = useClaudeStatus();
  if (Option.isNone(status)) {
    return <span className="text-muted-foreground">{CHECKING}</span>;
  }
  if (!status.value.installed) {
    return <ClaudeMissing checking={checking} recheck={recheck} />;
  }
  if (!status.value.loggedIn) {
    return <ClaudeLoggedOut checking={checking} recheck={recheck} />;
  }
  return <ClaudeReady />;
};

export { ClaudeState };

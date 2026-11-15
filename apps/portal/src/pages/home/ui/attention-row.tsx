import type { CredentialState } from "@masseater.dev/portal-protocol";
import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

const ACTIONS: Readonly<Record<CredentialState["kind"], string>> = {
  key: "鍵を登録する",
  login: "ログインする",
};

export const AttentionRow = ({ state }: Readonly<{ state: CredentialState }>): ReactNode => (
  <li className="flex items-center gap-2 py-2 text-sm">
    <CircleAlert aria-hidden className="text-warning size-4 shrink-0" />
    <span className="min-w-0 flex-1 truncate font-mono">{state.id}</span>
    <a className="text-link shrink-0 underline underline-offset-3" href={state.actionUrl}>
      {ACTIONS[state.kind]}
    </a>
  </li>
);

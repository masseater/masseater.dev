import type { CredentialState } from "@masseater.dev/portal-protocol";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { AttentionRow } from "./attention-row";

export const AttentionList = ({
  label,
  states,
}: Readonly<{ label: string; states: readonly CredentialState[] }>): ReactNode => (
  <ul aria-label={label} className="divide-border divide-y">
    {pipe(
      states,
      Arr.map((state) => <AttentionRow key={state.id} state={state} />),
    )}
  </ul>
);

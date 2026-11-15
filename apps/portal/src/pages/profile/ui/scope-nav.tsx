import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { AllScopesItem } from "./all-scopes-item";
import { ScopeItem } from "./scope-item";

const LABEL = "範囲";

export const ScopeNav = ({ scopes }: Readonly<{ scopes: readonly string[] }>): ReactNode => (
  <nav aria-label={LABEL} className="flex flex-col gap-1">
    <p className="text-muted-foreground px-3 text-xs font-bold">{LABEL}</p>
    <ul className="flex flex-col gap-0.5">
      <AllScopesItem />
      {pipe(
        scopes,
        Arr.map((name) => <ScopeItem key={name} name={name} />),
      )}
    </ul>
  </nav>
);

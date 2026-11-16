import type { Pair } from "@masseater.dev/shirushi-protocol";
import type { ReactNode } from "react";

import { ChoiceButton } from "./choice-button.tsx";
import { ClipButton } from "./clip-button.tsx";

export const PairCard = ({ pair }: Readonly<{ pair: Pair }>): ReactNode => (
  <li className="grid gap-2 py-3">
    <div className="grid grid-cols-2 gap-2">
      <ClipButton name="A" clip={pair.a} />
      <ClipButton name="B" clip={pair.b} />
    </div>
    <fieldset aria-label="好きなほう" className="m-0 flex min-w-0 gap-1 border-0 p-0">
      <ChoiceButton pair={pair} choice="a" />
      <ChoiceButton pair={pair} choice="b" />
      <ChoiceButton pair={pair} choice="neither" />
    </fieldset>
  </li>
);

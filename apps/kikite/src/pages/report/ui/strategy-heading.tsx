import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";

const STRATEGY = "聞き方";
const ASKED = "聞いた";
const GOOD = "聞いてほしかった";
const OFF = "ずれている";

export const StrategyHeading = (): ReactNode => (
  <tr>
    <th scope="col" className="text-left font-normal">
      {STRATEGY}
    </th>
    <th scope="col" className="text-right font-normal">
      {ASKED}
    </th>
    <th scope="col">
      <ThumbsUp aria-hidden="true" className="ml-auto size-4" />
      <span className="sr-only">{GOOD}</span>
    </th>
    <th scope="col">
      <ThumbsDown aria-hidden="true" className="ml-auto size-4" />
      <span className="sr-only">{OFF}</span>
    </th>
  </tr>
);

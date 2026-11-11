import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";

const STRATEGY = "聞き方";
const ASKED = "聞いた";
const GOOD = "聞いてほしかった";
const OFF = "ずれている";
const PICKED = "選ばれた";

const StrategyHeading = (): ReactNode => (
  <>
    <span>{STRATEGY}</span>
    <span className="text-right">{ASKED}</span>
    <ThumbsUp className="size-4 justify-self-end" aria-label={GOOD} />
    <ThumbsDown className="size-4 justify-self-end" aria-label={OFF} />
    <span className="text-right">{PICKED}</span>
  </>
);

export { StrategyHeading };

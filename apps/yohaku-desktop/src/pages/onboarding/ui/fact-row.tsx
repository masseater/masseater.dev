import type { Fact } from "@masseater.dev/yohaku-protocol";
import type { ReactNode } from "react";

const KINDS: Readonly<Record<(typeof Fact.Type)["kind"], string>> = {
  character: "人物",
  voice: "口調",
  event: "出来事",
  knowledge: "知識",
  setting: "舞台",
  idea: "ネタ",
};

const FactRow = ({ fact }: Readonly<{ fact: typeof Fact.Type }>): ReactNode => (
  <li className="flex gap-3 text-sm">
    <span className="text-muted-foreground w-12 shrink-0">{KINDS[fact.kind]}</span>
    <span className="w-28 shrink-0 font-medium">{fact.subject}</span>
    <span className="min-w-0 grow">{fact.body}</span>
  </li>
);

export { FactRow };

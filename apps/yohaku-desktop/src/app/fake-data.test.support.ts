import type { Fact } from "@masseater.dev/yohaku-protocol";
import { Option } from "effect";

export const EMOTION = "胸の奥がじんわりと温かくなった。";
export const DRAFT = ["彩葉の声に、", "かぐやの顔のまま振り向いてしまった。"] as const;
export const REWRITE = ["胸に手を当てて、", "鏡から目をそらした。"] as const;
const NO_WHEN = Option.getOrNull(Option.none<string>());
export const INGESTED: readonly (typeof Fact.Type)[] = [
  { kind: "character", subject: "ヤチヨ", body: "8000 年後のかぐや", when: NO_WHEN },
  { kind: "setting", subject: "ツクヨミ", body: "ヤチヨが管理する仮想空間", when: NO_WHEN },
];

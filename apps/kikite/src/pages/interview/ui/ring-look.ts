import { Keyboard, Mic, MicOff, Volume2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Asking, Listening } from "#/pages/interview/model/hooks";

type RingState = "listening" | "hearing" | "thinking" | "speaking" | "typing" | "deaf";

type Look = Readonly<{ Icon: LucideIcon; label: string }>;

type Signals = Readonly<{ listening: Listening; asking: Asking; hearing: boolean }>;

const LOOKS: Readonly<Record<RingState, Look>> = {
  listening: { Icon: Mic, label: "聞いている" },
  hearing: { Icon: Mic, label: "聞いている" },
  thinking: { Icon: Mic, label: "考えている" },
  speaking: { Icon: Volume2, label: "読み上げ中" },
  typing: { Icon: Keyboard, label: "入力中" },
  deaf: { Icon: MicOff, label: "マイクが使えません" },
};

const BY_LISTENING: Readonly<Record<Listening["status"], RingState>> = {
  off: "deaf",
  unsupported: "deaf",
  failed: "deaf",
  speaking: "speaking",
  typing: "typing",
  listening: "listening",
};

const ringStateOf = ({ listening, asking, hearing }: Signals): RingState => {
  if (asking.status === "drafting") {
    return "thinking";
  }
  const state = BY_LISTENING[listening.status];
  if (state === "listening" && hearing) {
    return "hearing";
  }
  return state;
};

export { LOOKS, ringStateOf };
export type { Look, RingState };

import { Mic, MicOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Asking, Listening } from "#/entities/interview";

export type RingState = "listening" | "hearing" | "thinking" | "typing" | "paused" | "deaf";

export type Look = Readonly<{ Icon: LucideIcon; label: string }>;

export type Signals = Readonly<{ listening: Listening; asking: Asking; hearing: boolean }>;

export const LOOKS: Readonly<Record<RingState, Look>> = {
  listening: { Icon: Mic, label: "聞いている" },
  hearing: { Icon: Mic, label: "聞いている" },
  thinking: { Icon: Mic, label: "考えている" },
  typing: { Icon: MicOff, label: "入力中" },
  paused: { Icon: MicOff, label: "止めている" },
  deaf: { Icon: MicOff, label: "マイクが使えません" },
};

const BY_LISTENING: Readonly<Record<Listening["status"], RingState>> = {
  off: "deaf",
  unsupported: "deaf",
  failed: "deaf",
  typing: "typing",
  listening: "listening",
  paused: "paused",
};

export const ringStateOf = ({ listening, asking, hearing }: Signals): RingState => {
  if (asking.status === "drafting") {
    return "thinking";
  }
  const state = BY_LISTENING[listening.status];
  if (state === "listening" && hearing) {
    return "hearing";
  }
  return state;
};

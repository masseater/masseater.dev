import type { ReactNode } from "react";

import { useListening } from "#/entities/interview/index.ts";
import { useToggleMic } from "#/features/voice-input/model/mic-toggle.ts";

import { Ring } from "./ring.tsx";
import type { RingSize } from "./ring.tsx";

const LABELS = {
  listening: "マイクを止める",
  paused: "マイクをつける",
} as const;

export const MicButton = ({ size }: Readonly<{ size: RingSize }>): ReactNode => {
  const { status } = useListening();
  const toggle = useToggleMic();
  if (status !== "listening" && status !== "paused") {
    return <Ring size={size} />;
  }
  return (
    <button
      type="button"
      aria-label={LABELS[status]}
      aria-pressed={status === "paused"}
      title={LABELS[status]}
      className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-4"
      onClick={toggle}
    >
      <Ring size={size} />
    </button>
  );
};

import type { ReactNode } from "react";

import { useListening, useToggleMic } from "#/pages/interview/model/hooks";

import { Ring } from "./ring.tsx";
import type { RingSize } from "./ring.tsx";

const LABELS = {
  listening: "マイクを止める",
  paused: "マイクをつける",
} as const;

const MicButton = ({ size }: Readonly<{ size: RingSize }>): ReactNode => {
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

export { MicButton };

import { Mic, MicOff, Volume2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useListening } from "#/pages/interview/model/hooks";
import type { Listening } from "#/pages/interview/model/hooks";

import { ListeningFailed } from "./listening-failed.tsx";

type Look = Readonly<{ Icon: LucideIcon; label: string; className: string }>;

const LOOKS: Readonly<Record<Exclude<Listening["status"], "failed">, Look>> = {
  listening: { Icon: Mic, label: "聞いている", className: "size-5 text-primary" },
  muted: { Icon: Volume2, label: "読み上げ中", className: "size-5 text-muted-foreground" },
  off: { Icon: MicOff, label: "マイクなし", className: "size-5 text-muted-foreground" },
  unsupported: { Icon: MicOff, label: "マイクなし", className: "size-5 text-muted-foreground" },
};

const ListeningIcon = (): ReactNode => {
  const listening = useListening();
  if (listening.status === "failed") {
    return <ListeningFailed message={listening.message} />;
  }
  const { Icon, label, className } = LOOKS[listening.status];
  return <Icon className={className} aria-label={label} />;
};

export { ListeningIcon };

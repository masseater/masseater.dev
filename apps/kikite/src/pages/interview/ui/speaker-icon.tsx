import { Volume2, VolumeOff } from "lucide-react";
import type { ReactNode } from "react";

const SpeakerIcon = ({ on }: Readonly<{ on: boolean }>): ReactNode => {
  if (on) {
    return <Volume2 />;
  }
  return <VolumeOff />;
};

export { SpeakerIcon };

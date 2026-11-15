import type { ReactNode } from "react";

import { useAsked } from "#/entities/interview";
import { MicButton } from "#/features/voice-input";

export const HeaderRing = (): ReactNode => useAsked() && <MicButton size="sm" />;

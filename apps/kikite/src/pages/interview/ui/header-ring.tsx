import type { ReactNode } from "react";

import { useAsked } from "#/entities/interview/index.ts";
import { MicButton } from "#/features/voice-input/index.ts";

export const HeaderRing = (): ReactNode => useAsked() && <MicButton size="sm" />;

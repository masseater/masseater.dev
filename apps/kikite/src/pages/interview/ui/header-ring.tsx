import type { ReactNode } from "react";

import { useAsked } from "#/entities/interview";
import { MicButton } from "#/features/voice-input";

const HeaderRing = (): ReactNode => useAsked() && <MicButton size="sm" />;

export { HeaderRing };

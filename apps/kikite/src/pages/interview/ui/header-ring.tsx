import type { ReactNode } from "react";

import { useAsked } from "#/pages/interview/model/hooks";

import { MicButton } from "./mic-button.tsx";

const HeaderRing = (): ReactNode => useAsked() && <MicButton size="sm" />;

export { HeaderRing };

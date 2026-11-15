import type { ReactNode } from "react";

import { useAsked } from "#/pages/interview/model/hooks";

import { MicButton } from "./mic-button.tsx";

export const HeaderRing = (): ReactNode => useAsked() && <MicButton size="sm" />;

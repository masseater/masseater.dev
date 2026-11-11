import type { ReactNode } from "react";

import { useAsked } from "#/pages/interview/model/hooks";

import { Ring } from "./ring.tsx";

const HeaderRing = (): ReactNode => useAsked() && <Ring size="sm" />;

export { HeaderRing };

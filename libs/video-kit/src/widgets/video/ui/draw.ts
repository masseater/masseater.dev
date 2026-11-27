import type { ReactNode } from "react";

import type { Shot } from "#/entities/cut/index.ts";

export type Draw = (shot: Shot) => ReactNode;

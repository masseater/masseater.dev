import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useRelease } from "#/features/update/api/update.ts";
import type { Release } from "#/shared/api";

import { UpdateCard } from "./update-card.tsx";

const card = (release: Release): ReactNode => <UpdateCard release={release} />;

export const UpdateNotice = (): ReactNode => pipe(useRelease(), Option.map(card), Option.getOrNull);

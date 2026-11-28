import type { ReactNode } from "react";

import { imageOf } from "#/entities/cut/index.ts";
import type { Shot } from "#/entities/cut/index.ts";

import { Picture } from "./picture.tsx";

export const ShotPicture = ({
  shot,
  name,
  at,
  className,
}: Readonly<{
  shot: Shot;
  name: string;
  at?: number | undefined;
  className?: string | undefined;
}>): ReactNode => <Picture at={at} className={className} src={imageOf(name)(shot)} />;

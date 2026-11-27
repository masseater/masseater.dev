import { Option } from "effect";
import type { ReactNode } from "react";

import { useSongView } from "#/entities/song/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { readyValue } from "#/shared/lib/index.ts";
import { Failure } from "#/shared/ui/index.ts";

import { SongFacts } from "./song-facts.tsx";

export const SongBody = ({ fumx }: Readonly<{ fumx: string }>): ReactNode =>
  Option.match(readyValue(useSongView(fumx)), {
    onNone: () => [],
    onSome: Option.match({
      onNone: () => <Failure>{LABELS.unreadable}</Failure>,
      onSome: (view) => <SongFacts view={view} />,
    }),
  });

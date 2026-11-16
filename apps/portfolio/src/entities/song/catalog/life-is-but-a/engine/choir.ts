import patterns from "#/entities/song/catalog/life-is-but-a/score/patterns.json";

import type { Life } from "./context.ts";
import { say } from "./voices.ts";
import type { Say } from "./voices.ts";
import type { Syllable } from "./words.ts";

const LYRIC = ["life", "is", "but", "a", "dream"];

interface Singer {
  readonly source: string;
  readonly words: readonly Syllable[];
  readonly transpose: number;
}

const SINGERS: Readonly<Record<string, Singer>> = patterns.singers;

export interface Choir extends Omit<Say, "syllable" | "source" | "label"> {
  readonly singer: string;
  readonly index: number;
}

export const choir =
  (life: Life) =>
  ({ singer, index, key, ...rest }: Choir): void => {
    const sung = SINGERS[singer] ?? { source: "", words: [], transpose: 0 };
    say(life)({
      source: sung.source,
      label: `${singer} ${LYRIC[index] ?? ""}`,
      ...rest,
      syllable: sung.words[index] ?? { from: 0, to: 0, key: 0 },
      key: key + sung.transpose,
    });
  };

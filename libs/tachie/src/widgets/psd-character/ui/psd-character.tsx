import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

import { resolveVisibility } from "#/entities/character/index.ts";
import { useCharacter, useRecordings } from "#/widgets/psd-character/model/atoms.ts";
import { stateOf } from "#/widgets/psd-character/model/part.ts";
import type { Part } from "#/widgets/psd-character/model/part.ts";
import { speechAt } from "#/widgets/psd-character/model/voice.ts";
import type { Voice } from "#/widgets/psd-character/model/voice.ts";

import { CharacterCanvas } from "./character-canvas.tsx";

export interface PsdCharacterProps {
  readonly psd: string;
  readonly favorites?: string | undefined;
  readonly parts?: readonly Part[];
  readonly voices?: readonly Voice[];
  readonly className?: string | undefined;
}

const NO_PARTS: readonly Part[] = [];
const NO_VOICES: readonly Voice[] = [];

const recordedIn = (voices: readonly Voice[]): readonly string[] =>
  pipe(
    voices,
    Arr.flatMap(({ audio }) => Option.toArray(Option.fromNullishOr(audio))),
    Arr.dedupe,
  );

export const PsdCharacter = ({
  psd,
  favorites,
  parts = NO_PARTS,
  voices = NO_VOICES,
  className,
}: PsdCharacterProps): ReactNode => {
  const character = useCharacter({ psd, favorites });
  const recordings = useRecordings(recordedIn(voices));
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const state = pipe(
    recordings,
    Option.map((audio) =>
      stateOf({ parts, moment: { frame, fps, speech: speechAt({ voices, frame, fps, audio }) } }),
    ),
  );
  const shown = pipe(
    Option.all({ loaded: character, text: state }),
    Option.map(({ loaded, text }) => ({
      tree: loaded.tree,
      visibility: resolveVisibility({
        tree: loaded.tree,
        favorites: loaded.favorites,
        state: text,
      }),
    })),
  );
  return Option.match(shown, {
    onNone: () => false,
    onSome: (found) => (
      <CharacterCanvas className={className} tree={found.tree} visibility={found.visibility} />
    ),
  });
};

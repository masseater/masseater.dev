import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import type { ReactNode } from "react";

import { keyOf, tracksAtom } from "#/features/play-stems/model/tracks.ts";
import type { Track } from "#/features/play-stems/model/tracks.ts";
import { LABELS } from "#/shared/config/index.ts";

import { StemMixer } from "./stem-mixer.tsx";
import { StemNote } from "./stem-note.tsx";

const loading = (): ReactNode => <StemNote text={LABELS.loadingStems} />;

const failed = (): ReactNode => <StemNote text={LABELS.stemsFailed} />;

const mixer = ({ value }: Readonly<{ value: readonly Track[] }>): ReactNode => (
  <StemMixer tracks={value} />
);

export const StemDeck = ({ urls }: Readonly<{ urls: readonly string[] }>): ReactNode => {
  const tracks = tracksAtom(keyOf(urls));
  return AsyncResult.match(useAtomValue(tracks), {
    onInitial: loading,
    onFailure: failed,
    onSuccess: mixer,
  });
};

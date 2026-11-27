import { Match } from "effect";
import type { ReactNode } from "react";

import type { Scene } from "#/entities/script/index.ts";

import type { BookendKind } from "./bookend-scene.tsx";
import { BookendScene } from "./bookend-scene.tsx";
import type { MaterialKind } from "./material-scene.tsx";
import { MaterialScene } from "./material-scene.tsx";
import type { SceneProps } from "./scene-props.ts";
import type { SectionKind } from "./section-scene.tsx";
import { SectionScene } from "./section-scene.tsx";

export const StandardScene = ({
  timed,
  format,
  number,
  credits,
}: Readonly<SceneProps & { credits: readonly string[] }>): ReactNode => {
  const bookend = (scene: BookendKind): ReactNode => (
    <BookendScene credits={credits} format={format} number={number} scene={scene} timed={timed} />
  );
  const section = (scene: SectionKind): ReactNode => (
    <SectionScene format={format} number={number} scene={scene} timed={timed} />
  );
  const material = (scene: MaterialKind): ReactNode => (
    <MaterialScene format={format} number={number} scene={scene} timed={timed} />
  );
  return Match.value<Scene>(timed.scene).pipe(
    Match.discriminatorsExhaustive("kind")({
      title: bookend,
      ending: bookend,
      talk: section,
      points: section,
      rating: section,
      code: material,
      media: material,
      quote: material,
    }),
  );
};

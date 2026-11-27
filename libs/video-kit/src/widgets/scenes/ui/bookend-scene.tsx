import { Match } from "effect";
import type { ReactNode } from "react";

import type { Scene } from "#/entities/script/index.ts";

import { EndingScene } from "./ending-scene.tsx";
import type { SceneProps } from "./scene-props.ts";
import { TitleScene } from "./title-scene.tsx";

export type BookendKind = Extract<Scene, Readonly<{ kind: "ending" | "title" }>>;

export const BookendScene = ({
  timed,
  format,
  number,
  scene,
  credits,
}: Readonly<SceneProps & { scene: BookendKind; credits: readonly string[] }>): ReactNode =>
  Match.value<BookendKind>(scene).pipe(
    Match.discriminatorsExhaustive("kind")({
      title: ({ title, items }) => (
        <TitleScene format={format} items={items} number={number} timed={timed} title={title} />
      ),
      ending: ({ title }) => (
        <EndingScene
          credits={credits}
          format={format}
          number={number}
          timed={timed}
          title={title}
        />
      ),
    }),
  );

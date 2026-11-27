import { Match } from "effect";
import type { ReactNode } from "react";

import type { Scene } from "#/entities/script/index.ts";

import { PointsScene } from "./points-scene.tsx";
import { RatingScene } from "./rating-scene.tsx";
import type { SceneProps } from "./scene-props.ts";
import { TalkScene } from "./talk-scene.tsx";

export type SectionKind = Extract<Scene, Readonly<{ kind: "points" | "rating" | "talk" }>>;

export const SectionScene = ({
  timed,
  format,
  number,
  scene,
}: Readonly<SceneProps & { scene: SectionKind }>): ReactNode =>
  Match.value<SectionKind>(scene).pipe(
    Match.discriminatorsExhaustive("kind")({
      talk: ({ heading }) => (
        <TalkScene format={format} heading={heading} number={number} timed={timed} />
      ),
      points: ({ heading, items }) => (
        <PointsScene
          format={format}
          heading={heading}
          items={items}
          number={number}
          timed={timed}
        />
      ),
      rating: ({ heading, score, max }) => (
        <RatingScene
          format={format}
          heading={heading}
          max={max}
          number={number}
          score={score}
          timed={timed}
        />
      ),
    }),
  );

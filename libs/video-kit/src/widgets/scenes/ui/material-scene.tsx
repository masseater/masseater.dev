import { Match, Option } from "effect";
import type { ReactNode } from "react";

import type { Scene } from "#/entities/script/index.ts";

import { CodeScene } from "./code-scene.tsx";
import { MediaScene } from "./media-scene.tsx";
import { QuoteScene } from "./quote-scene.tsx";
import type { SceneProps } from "./scene-props.ts";

export type MaterialKind = Extract<Scene, Readonly<{ kind: "code" | "media" | "quote" }>>;

export const MaterialScene = ({
  timed,
  format,
  number,
  scene,
}: Readonly<SceneProps & { scene: MaterialKind }>): ReactNode =>
  Match.value<MaterialKind>(scene).pipe(
    Match.discriminatorsExhaustive("kind")({
      code: ({ heading, code }) => (
        <CodeScene code={code} format={format} heading={heading} number={number} timed={timed} />
      ),
      media: ({ src, alt }) => (
        <MediaScene alt={alt} format={format} number={number} src={src} timed={timed} />
      ),
      quote: ({ text, source }) => (
        <QuoteScene
          format={format}
          number={number}
          source={Option.fromUndefinedOr(source)}
          text={text}
          timed={timed}
        />
      ),
    }),
  );

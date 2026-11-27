import { Option } from "effect";
import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

import type { LayerTree, Visibility } from "#/entities/character/index.ts";
import { paintCharacter } from "#/widgets/psd-character/model/paint.ts";

export interface CharacterCanvasProps {
  readonly tree: LayerTree;
  readonly visibility: Visibility;
  readonly className?: string | undefined;
}

export const CharacterCanvas = ({
  tree,
  visibility,
  className,
}: CharacterCanvasProps): ReactNode => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const context = Option.flatMap(Option.fromNullishOr(canvasRef.current), (found) =>
      Option.fromNullishOr(found.getContext("2d")),
    );
    if (Option.isSome(context)) {
      paintCharacter({ context: context.value, tree, visibility });
    }
  }, [tree, visibility]);
  return <canvas className={className} height={tree.height} ref={canvasRef} width={tree.width} />;
};

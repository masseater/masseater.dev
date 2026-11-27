import { Option } from "effect";
import type { ReactNode } from "react";

import type { SceneOverride, SceneProps } from "./scene-props.ts";
import { StandardScene } from "./standard-scene.tsx";

export const SceneSlot = ({
  timed,
  format,
  number,
  credits,
  override,
}: Readonly<
  SceneProps & { credits: readonly string[]; override: Option.Option<SceneOverride> }
>): ReactNode => {
  if (Option.isSome(override)) {
    return override.value({ timed, format, number });
  }
  return <StandardScene credits={credits} format={format} number={number} timed={timed} />;
};

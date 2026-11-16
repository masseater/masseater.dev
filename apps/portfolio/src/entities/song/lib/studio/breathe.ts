import { Duration, Effect } from "effect";

const BREATH_MILLIS = 1;
const BREATH = Duration.millis(BREATH_MILLIS);

export const breathe = Effect.sleep(BREATH);

export interface Stage {
  readonly share: number;
  readonly label: string;
}

export type Progressing = (share: number, label: string) => void;

export const reached =
  (progress: Progressing) =>
  ({ share, label }: Stage): Effect.Effect<void> =>
    Effect.andThen(
      Effect.sync(() => {
        progress(share, label);
      }),
      breathe,
    );

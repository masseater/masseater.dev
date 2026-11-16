import type { Forecast, Verdict } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, pipe } from "effect";

const counted =
  (verdicts: readonly Verdict[]) =>
  (forecasts: readonly Forecast[]): string =>
    globalThis.String(
      pipe(
        forecasts,
        Arr.filter(({ verdict }) => Arr.contains(verdicts, verdict)),
        Arr.length,
      ),
    );

const DECIDED: readonly Verdict[] = ["hit", "miss"];

const HIT: readonly Verdict[] = ["hit"];

export const scoreOf = (forecasts: readonly Forecast[]): string =>
  `AI の予想 当たり ${counted(HIT)(forecasts)} / ${counted(DECIDED)(forecasts)}`;

export const revealLabel = (forecasts: readonly Forecast[]): string =>
  `AI の予想を見る ${globalThis.String(forecasts.length)}`;

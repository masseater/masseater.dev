import { Array as Arr, pipe } from "effect";

import { stages } from "#/entities/entry/model/cascade";

export const STAGE_WIDTH = 452;

export const STAGE_HEADER = 40;

export const ROW_HEIGHT = 76;

const STAGE_GAP = 24;

export const TOP = 0;

export const stageHeight = (rows: number): number => STAGE_HEADER + rows * ROW_HEIGHT;

const [stagesBottom, tops] = pipe(
  stages,
  Arr.mapAccum(TOP, (top, stage) => [top + stageHeight(stage.rows) + STAGE_GAP, top] as const),
);

export const FLOW_HEIGHT = stagesBottom - STAGE_GAP;

export const stageTops = tops;

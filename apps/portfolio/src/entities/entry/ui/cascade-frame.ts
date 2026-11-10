import { Array as Arr, pipe } from "effect";

import { stages } from "#/entities/entry/model/cascade";

const STAGE_WIDTH = 452;

const STAGE_HEADER = 40;

const ROW_HEIGHT = 76;

const STAGE_GAP = 24;

const TOP = 0;

const stageHeight = (rows: number): number => STAGE_HEADER + rows * ROW_HEIGHT;

const [stagesBottom, stageTops] = pipe(
  stages,
  Arr.mapAccum(TOP, (top, stage) => [top + stageHeight(stage.rows) + STAGE_GAP, top] as const),
);

const FLOW_HEIGHT = stagesBottom - STAGE_GAP;

export { FLOW_HEIGHT, ROW_HEIGHT, STAGE_HEADER, STAGE_WIDTH, TOP, stageHeight, stageTops };

import { Array as Arr, Option, Record as Rec, pipe } from "effect";

type Column = "left" | "right";

type Stage = Readonly<{ id: string; label: string; rows: number }>;

type CascadeNode = Readonly<{
  id: string;
  label: string;
  detail: string;
  stage: string;
  column: Column;
  row: number;
}>;

type CascadeLink = Readonly<{ source: string; target: string; label: string }>;

type LinkDirection = "down" | "across" | "down-across";

type StopDelays = Readonly<Record<string, number>>;

type CascadeState =
  | Readonly<{ status: "running" }>
  | Readonly<{ status: "playing"; round: number }>
  | Readonly<{ status: "stopped"; origin: string; round: number }>;

const RUNNING: CascadeState = { status: "running" };

const FIRST_ROUND = 1;

const NEXT = 1;

const ORIGIN_DEPTH = 0;

const FIRST_STAGE = 0;

const STAGE_GAP = 1400;

const HOP_GAP = 600;

const stages: readonly Stage[] = [
  { id: "own", label: "当事者の店が止まる", rows: 2 },
  { id: "partner", label: "取引先が止まる", rows: 2 },
  { id: "competitor", label: "取引のない競合が止まる", rows: 1 },
  { id: "world", label: "世界中が止まる", rows: 3 },
];

const cascadeNodes: readonly CascadeNode[] = [
  { id: "allnet", label: "ALL.Net", detail: "2026年11月", stage: "own", column: "left", row: 0 },
  {
    id: "arcade",
    label: "ゲームセンター",
    detail: "全国、太鼓の達人も",
    stage: "own",
    column: "right",
    row: 0,
  },
  { id: "nichirei", label: "ニチレイ", detail: "2026年7月", stage: "own", column: "left", row: 1 },
  {
    id: "kfc",
    label: "KFC の全店舗",
    detail: "食材が届かない",
    stage: "own",
    column: "right",
    row: 1,
  },
  {
    id: "askul",
    label: "アスクル",
    detail: "2025年10月",
    stage: "partner",
    column: "left",
    row: 0,
  },
  {
    id: "muji",
    label: "無印良品とロフト",
    detail: "ネットストア",
    stage: "partner",
    column: "right",
    row: 0,
  },
  { id: "asahi", label: "アサヒ", detail: "2025年9月", stage: "partner", column: "left", row: 1 },
  {
    id: "pb",
    label: "コンビニの PB",
    detail: "クリアクーラーなど",
    stage: "partner",
    column: "right",
    row: 1,
  },
  {
    id: "kirin",
    label: "キリン",
    detail: "業務用ビールと歳暮",
    stage: "competitor",
    column: "right",
    row: 0,
  },
  {
    id: "crowdstrike",
    label: "CrowdStrike",
    detail: "2024年7月",
    stage: "world",
    column: "left",
    row: 0,
  },
  { id: "windows", label: "Windows", detail: "約850万台", stage: "world", column: "right", row: 0 },
  {
    id: "hospital",
    label: "病院・航空・銀行",
    detail: "世界中",
    stage: "world",
    column: "right",
    row: 1,
  },
  {
    id: "cloud",
    label: "AWS と Azure",
    detail: "2025年10月",
    stage: "world",
    column: "left",
    row: 2,
  },
  {
    id: "services",
    label: "その上のサービス",
    detail: "全部",
    stage: "world",
    column: "right",
    row: 2,
  },
];

const cascadeLinks: readonly CascadeLink[] = [
  { source: "allnet", target: "arcade", label: "オンライン" },
  { source: "nichirei", target: "kfc", label: "食品物流" },
  { source: "askul", target: "muji", label: "物流の委託" },
  { source: "asahi", target: "pb", label: "製造の委託" },
  { source: "asahi", target: "kirin", label: "注文が殺到" },
  { source: "crowdstrike", target: "windows", label: "更新" },
  { source: "windows", target: "hospital", label: "" },
  { source: "cloud", target: "services", label: "" },
];

const directionOf = (source: CascadeNode, target: CascadeNode): LinkDirection => {
  if (source.column === target.column) {
    return "down";
  }
  if (source.stage === target.stage && source.row === target.row) {
    return "across";
  }
  return "down-across";
};

const nodeOf = (id: string): Option.Option<CascadeNode> =>
  pipe(
    cascadeNodes,
    Arr.findFirst((node) => node.id === id),
  );

const linkDirection = (link: CascadeLink): LinkDirection =>
  pipe(
    Option.all([nodeOf(link.source), nodeOf(link.target)]),
    Option.map(([source, target]) => directionOf(source, target)),
    Option.getOrElse((): LinkDirection => "across"),
  );

const childrenOf = (id: string): readonly string[] =>
  pipe(
    cascadeLinks,
    Arr.filter(({ source }) => source === id),
    Arr.map(({ target }) => target),
  );

const isRoot = (id: string): boolean =>
  pipe(
    cascadeLinks,
    Arr.every(({ target }) => target !== id),
  );

type Depth = readonly [string, number];

const walk = (id: string, depth: number): readonly Depth[] => {
  const below = pipe(
    childrenOf(id),
    Arr.flatMap((child) => walk(child, depth + NEXT)),
  );
  return [[id, depth], ...below];
};

const stageIndex = (stage: string): number =>
  pipe(
    stages,
    Arr.findFirstIndex(({ id }) => id === stage),
    Option.getOrElse(() => FIRST_STAGE),
  );

const delaysOfRoot = (node: CascadeNode): readonly Depth[] => {
  const start = stageIndex(node.stage) * STAGE_GAP;
  return pipe(
    walk(node.id, ORIGIN_DEPTH),
    Arr.map(([id, depth]): Depth => [id, start + depth * HOP_GAP]),
  );
};

const rootDelays = (): StopDelays =>
  pipe(
    cascadeNodes,
    Arr.filter(({ id }) => isRoot(id)),
    Arr.flatMap(delaysOfRoot),
    Rec.fromEntries,
  );

const originDelays = (origin: string): StopDelays =>
  pipe(
    walk(origin, ORIGIN_DEPTH),
    Arr.map(([id, depth]): Depth => [id, depth * HOP_GAP]),
    Rec.fromEntries,
  );

const stopDelays = (state: CascadeState): StopDelays => {
  if (state.status === "running") {
    return {};
  }
  if (state.status === "playing") {
    return rootDelays();
  }
  return originDelays(state.origin);
};

const roundOf = (state: CascadeState): number => {
  if (state.status === "running") {
    return ORIGIN_DEPTH;
  }
  return state.round;
};

const clicked =
  (id: string) =>
  (state: CascadeState): CascadeState => {
    if (Rec.has(stopDelays(state), id)) {
      return RUNNING;
    }
    return { status: "stopped", origin: id, round: roundOf(state) + NEXT };
  };

const started = (state: CascadeState): CascadeState => {
  if (state.status === "running") {
    return { status: "playing", round: FIRST_ROUND };
  }
  return state;
};

const replayed = (state: CascadeState): CascadeState => ({
  status: "playing",
  round: roundOf(state) + NEXT,
});

export type { CascadeLink, CascadeNode, CascadeState, Column, LinkDirection, Stage, StopDelays };
export {
  RUNNING,
  cascadeLinks,
  cascadeNodes,
  clicked,
  linkDirection,
  replayed,
  roundOf,
  stages,
  started,
  stopDelays,
};

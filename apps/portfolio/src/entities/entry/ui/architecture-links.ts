import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import {
  APPS_LANE,
  APPS_Y,
  BAND_HEIGHT,
  DEPLOY_LANE,
  GREASY_OFFSET,
  OBSERVE_LANE,
  SERVICE_HEIGHT,
  STARS_OFFSET,
  VISITOR,
  ZENN_OFFSET,
  groupBoxes,
} from "./architecture-grid";
import type { LinkKind, LinkSpec, Route, Side } from "./architecture-grid";
import { apps, services } from "./architecture-services";

const topOf = Rec.fromEntries(
  pipe(
    services,
    Arr.map((spec) => [spec.id, groupBoxes[spec.group].y + spec.at.y] as const),
  ),
);

const absoluteTop = (id: string): number =>
  pipe(
    Rec.get(topOf, id),
    Option.getOrElse(() => VISITOR.y),
  );

const absoluteBottom = (id: string): number => absoluteTop(id) + SERVICE_HEIGHT;

const DEFAULT_OFFSET = 20;

const MIDDLE_STEP = 0.5;

const lane = (sourceY: number, targetY: number, laneY: number): Route => ({
  stepPosition: (laneY - sourceY) / (targetY - sourceY),
  offset: DEFAULT_OFFSET,
});

const loop = (offset: number): Route => ({ stepPosition: MIDDLE_STEP, offset });

const deployLane = lane(absoluteBottom("actions"), absoluteTop("site"), DEPLOY_LANE);

const appsLane = lane(absoluteBottom("waf"), absoluteTop("mosaic"), APPS_LANE);

const observeLane = lane(APPS_Y + BAND_HEIGHT, absoluteTop("rum"), OBSERVE_LANE);

const DEFAULT_ROUTE: Route = { stepPosition: MIDDLE_STEP, offset: DEFAULT_OFFSET };

type LinkOptions = Readonly<{ kind: LinkKind; label?: string; route?: Route; both?: boolean }>;

const link = (
  from: readonly [string, Side],
  to: readonly [string, Side],
  options: LinkOptions,
): LinkSpec => ({
  from,
  to,
  kind: options.kind,
  label: options.label ?? "",
  route: options.route ?? DEFAULT_ROUTE,
  both: options.both ?? false,
});

const links: readonly LinkSpec[] = [
  link(["claude", "right"], ["repo", "left"], { kind: "api", label: "PR" }),
  link(["mcp", "right"], ["repo", "bottom"], { kind: "dash", label: "Sloppedia の PR" }),
  link(["repo", "right"], ["actions", "left"], { kind: "api", label: "push" }),
  link(["actions", "right"], ["openrouter", "left"], { kind: "api", label: "lint の判定" }),
  link(["actions", "bottom"], ["iac", "top"], { kind: "api", label: "設定を当てる" }),
  link(["actions", "top"], ["zenn", "top"], {
    kind: "dash",
    label: "記事を写す",
    route: loop(ZENN_OFFSET),
  }),
  link(["repo", "top"], ["greasyfork", "top"], {
    kind: "dash",
    label: "release/ を読む",
    route: loop(GREASY_OFFSET),
  }),
  link(["actions", "bottom"], ["site", "top"], {
    kind: "api",
    label: "alchemy deploy",
    route: deployLane,
  }),
  link(["actions", "bottom"], ["brokerWorker", "top"], {
    kind: "dash",
    label: "OIDC と短命トークン",
    route: deployLane,
    both: true,
  }),
  link(["otherCi", "bottom"], ["brokerWorker", "top"], { kind: "dash", both: true }),
  link(["brokerWorker", "right"], ["secrets", "left"], { kind: "api" }),
  link(["brokerWorker", "bottom"], ["appDb", "top"], { kind: "api" }),
  link(["visitor", "right"], ["waf", "left"], { kind: "main", label: "HTTPS" }),
  link(["waf", "right"], ["site", "left"], { kind: "main", label: "通過" }),
  link(["site", "right"], ["assets", "left"], { kind: "main", label: "HTML · JS" }),
  link(["site", "bottom"], ["stars", "bottom"], {
    kind: "main",
    label: "/api/stars/*",
    route: loop(STARS_OFFSET),
  }),
  link(["waf", "bottom"], ["honeypot", "left"], { kind: "dash", label: "罠のパス" }),
  link(["honeypot", "right"], ["ae", "left"], { kind: "dash" }),
  ...pipe(
    apps,
    Arr.map(([id]) => link(["waf", "bottom"], [id, "top"], { kind: "api", route: appsLane })),
  ),
  link(["apps", "bottom"], ["rum", "top"], {
    kind: "dash",
    label: "ビーコン",
    route: observeLane,
  }),
  link(["apps", "bottom"], ["observability", "top"], {
    kind: "dash",
    label: "ログ · トレース",
    route: observeLane,
  }),
  link(["apps", "bottom"], ["logpush", "top"], {
    kind: "dash",
    label: "trace events",
    route: observeLane,
  }),
  link(["logpush", "right"], ["r2", "left"], { kind: "dash" }),
];

export { links };

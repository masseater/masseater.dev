import type { Edge, Node, SmoothStepPathOptions } from "@xyflow/react";

import type { GlyphName, Tone } from "./architecture-glyph";

type Side = "top" | "right" | "bottom" | "left";

type LinkKind = "main" | "api" | "dash";

type ServiceData = Readonly<{ name: string; note: string; glyph: GlyphName; tone: Tone }>;

type GroupData = Readonly<{
  title: string;
  tone: Tone;
  glyph: GlyphName;
  titleAt: "top-left" | "bottom-right";
}>;

type ServiceNode = Node<ServiceData, "service">;

type StepLink = Edge & Readonly<{ pathOptions: SmoothStepPathOptions }>;

type GroupNode = Node<GroupData, "group">;

type Point = Readonly<{ x: number; y: number }>;

type Box = Readonly<{ x: number; y: number; width: number; height: number }>;

type GroupId = "dev" | "outside" | "edge" | "broker" | "apps" | "observe";

type ServiceSpec = Readonly<{
  id: string;
  group: GroupId;
  at: Point;
  name: string;
  note: string;
  glyph: GlyphName;
}>;

type Route = Readonly<{ stepPosition: number; offset: number }>;

type LinkSpec = Readonly<{
  from: readonly [string, Side];
  to: readonly [string, Side];
  kind: LinkKind;
  label: string;
  route: Route;
  both: boolean;
}>;

const SERVICE_WIDTH = 160;

const SERVICE_HEIGHT = 96;

const TILE_SIZE = 54;

const HALF = 2;

const WHOLE = 1;

const HANDLE_SIZE = 1;

const ORIGIN = 0;

const TILE_LEFT = (SERVICE_WIDTH - TILE_SIZE) / HALF;

const TILE_MIDDLE = TILE_SIZE / HALF;

const COLUMN = { first: 30, second: 250, third: 470, fourth: 690 } as const;

const ROW = { upper: 52, lower: 192 } as const;

const LEFT_X = 180;

const RIGHT_X = 1120;

const UPPER_Y = 0;

const MIDDLE_Y = 380;

const APPS_Y = 760;

const OBSERVE_Y = 1020;

const WIDE_WIDTH = 900;

const NARROW_WIDTH = 460;

const FULL_WIDTH = 1580;

const BLOCK_HEIGHT = 320;

const BAND_HEIGHT = 200;

const APP_LEFT = 20;

const APP_STEP = 172;

const OBSERVE_STEP = 260;

const VISITOR = { x: 0, y: MIDDLE_Y + ROW.upper } as const;

const DEPLOY_LANE = 350;

const APPS_LANE = 730;

const OBSERVE_LANE = 1000;

const STARS_OFFSET = 24;

const ZENN_OFFSET = 22;

const GREASY_OFFSET = 40;

const DIAGRAM_WIDTH = FULL_WIDTH;

const DIAGRAM_HEIGHT = OBSERVE_Y + BAND_HEIGHT;

const groupBoxes = {
  dev: { x: LEFT_X, y: UPPER_Y, width: WIDE_WIDTH, height: BLOCK_HEIGHT },
  outside: { x: RIGHT_X, y: UPPER_Y, width: NARROW_WIDTH, height: BLOCK_HEIGHT },
  edge: { x: LEFT_X, y: MIDDLE_Y, width: WIDE_WIDTH, height: BLOCK_HEIGHT },
  broker: { x: RIGHT_X, y: MIDDLE_Y, width: NARROW_WIDTH, height: BLOCK_HEIGHT },
  apps: { x: ORIGIN, y: APPS_Y, width: FULL_WIDTH, height: BAND_HEIGHT },
  observe: { x: ORIGIN, y: OBSERVE_Y, width: FULL_WIDTH, height: BAND_HEIGHT },
} as const satisfies Record<GroupId, Box>;

const groupData = {
  dev: { title: "開発 & CI", tone: "gh", glyph: "github", titleAt: "top-left" },
  outside: {
    title: "外部 · ほかのリポ",
    tone: "gh",
    glyph: "waypoints",
    titleAt: "bottom-right",
  },
  edge: {
    title: "サイト配信 · masseater.dev ゾーン",
    tone: "cf",
    glyph: "cloudflare",
    titleAt: "top-left",
  },
  broker: {
    title: "認証情報ブローカー · credentials.masseater.dev",
    tone: "cf",
    glyph: "key",
    titleAt: "top-left",
  },
  apps: {
    title: "同じゾーンに載るほかのリポ",
    tone: "cf",
    glyph: "cloudflare",
    titleAt: "top-left",
  },
  observe: { title: "観測", tone: "gh", glyph: "activity", titleAt: "top-left" },
} as const satisfies Record<GroupId, GroupData>;

export type {
  Box,
  GroupData,
  GroupId,
  GroupNode,
  LinkKind,
  LinkSpec,
  Point,
  Route,
  ServiceData,
  ServiceNode,
  ServiceSpec,
  Side,
  StepLink,
};
export {
  APPS_LANE,
  APPS_Y,
  APP_LEFT,
  APP_STEP,
  BAND_HEIGHT,
  COLUMN,
  DEPLOY_LANE,
  DIAGRAM_HEIGHT,
  DIAGRAM_WIDTH,
  GREASY_OFFSET,
  HALF,
  HANDLE_SIZE,
  OBSERVE_LANE,
  OBSERVE_STEP,
  ORIGIN,
  ROW,
  SERVICE_HEIGHT,
  SERVICE_WIDTH,
  STARS_OFFSET,
  TILE_LEFT,
  TILE_MIDDLE,
  TILE_SIZE,
  VISITOR,
  WHOLE,
  ZENN_OFFSET,
  groupBoxes,
  groupData,
};

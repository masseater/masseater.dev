import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { LinkKind } from "./architecture-grid";

const entries = [
  ["main", "閲覧のリクエスト"],
  ["api", "デプロイ · API · ルーティング"],
  ["dash", "鍵 · 同期 · ログ · 監視"],
] as const satisfies readonly (readonly [LinkKind, string])[];

const itemClass = {
  main: "architecture-legend-item architecture-legend-main",
  api: "architecture-legend-item",
  dash: "architecture-legend-item architecture-legend-dash",
} as const satisfies Record<LinkKind, string>;

const ArchitectureLegend = (): ReactNode => (
  <ul className="architecture-legend">
    {pipe(
      entries,
      Arr.map(([kind, text]) => (
        <li className={itemClass[kind]} key={kind}>
          {text}
        </li>
      )),
    )}
  </ul>
);

export { ArchitectureLegend };

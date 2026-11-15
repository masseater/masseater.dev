import type { Detail } from "./model-detail";

type ChartRow =
  | Readonly<{
      status: "interval";
      key: string;
      label: string;
      color: string;
      detail: Detail;
      ratio: number;
      interval: Readonly<{ lower: number; upper: number }>;
    }>
  | Readonly<{
      status: "point";
      key: string;
      label: string;
      color: string;
      ratio: number;
      detail: Detail;
    }>
  | Readonly<{ status: "unsupported"; key: string; label: string }>;

export type { ChartRow };

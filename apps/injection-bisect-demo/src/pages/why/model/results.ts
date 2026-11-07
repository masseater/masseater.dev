const ROWS = [
  { label: "注入ありの 19 本で見つけた数", ours: "19 本", direct: "19 本" },
  { label: "注入なしの 6 本で誤検知した数", ours: "0 本", direct: "0 本" },
  { label: "1 本の判定時間（中央値）", ours: "0.4 秒", direct: "1.4 秒" },
  { label: "1 本の費用", ours: "$0.00015", direct: "$0.00011" },
  { label: "注入の指示に従う余地", ours: "なし", direct: "あり" },
] as const;

type Row = (typeof ROWS)[number];

export { ROWS };
export type { Row };

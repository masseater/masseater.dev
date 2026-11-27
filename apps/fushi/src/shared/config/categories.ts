export type Category = Readonly<{
  id: string;
  name: string;
  views: readonly string[];
}>;

export const HARMONY = "harmony";

export const AUTOMATION = "automation";

export const MIX = "mix";

export const CATEGORIES: readonly Category[] = [
  {
    id: "structure",
    name: "構成・展開",
    views: ["区間の長さと順番", "サビへの入り方", "落ちサビ"],
  },
  { id: HARMONY, name: "和声", views: ["進行", "借用・転調", "ボイシング"] },
  { id: "melody", name: "旋律", views: ["音域", "跳躍", "息継ぎ"] },
  { id: "rhythm", name: "リズム・グルーヴ", views: ["スウィング", "拍からのずれ", "ベロシティ"] },
  { id: "arrange", name: "アレンジ", views: ["楽器の出入り", "同時に鳴るパート数"] },
  { id: AUTOMATION, name: "オートメーション", views: ["フィルター", "音量", "送り"] },
  { id: MIX, name: "ミックス", views: ["定位", "音量バランス", "サイドチェイン"] },
  { id: "sound", name: "音色", views: ["楽器", "エフェクト"] },
];

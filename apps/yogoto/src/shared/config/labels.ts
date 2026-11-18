import type { JobState } from "@masseater.dev/yogoto-protocol";

export const LABELS = {
  songs: "曲",
  link: "曲のリンク",
  linkHint: "YouTube・ニコニコ・SoundCloud のリンク",
  importLinks: "取り込む",
  chooseFiles: "ファイル",
  empty: "リンクかファイルを投げると、ここに曲が並びます",
  notSeparated: "まだ分離していません",
  loadingStems: "stem を読み込んでいます",
  stemsFailed: "stem を読み込めませんでした",
  separate: "分離",
  model: "分離に使うモデル",
  play: "再生",
  stop: "止める",
  solo: "S",
  mute: "M",
  soloOf: "ソロ",
  muteOf: "ミュート",
  seek: "再生位置",
  separator: " / ",
} as const;

export const JOB_STATES: Readonly<Record<JobState, string>> = {
  queued: "待ち",
  running: "処理中",
  done: "完了",
  failed: "失敗",
};

export const JOB_STAGES: Readonly<Record<string, string>> = {
  downloading: "取得中",
  "loading model": "モデルを準備中",
  decoding: "読み込み中",
  separating: "分離中",
  "writing stems": "書き出し中",
};

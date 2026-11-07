const COPY = {
  title: "OCR エンジンの日本語の読み取り",
  lead: "合成した 24 枚と JaWildText の写真 60 枚を、OCR エンジンと画像対応のモデルに書き写させた。正確さは 1 から文字誤り率を引いた値で、文字 F1 は読む順番を無視して文字の過不足だけを見た値である。",
  engine: "エンジン",
  overall: "全体",
  accuracy: "正確さ",
  charF1: "文字 F1",
  seconds: "1 枚の時間",
  cost: "1 枚の費用",
  machine: "動かした環境",
  synthetic: "合成した文書の正確さ",
  jaWildText: "JaWildText の写真の正確さ",
  back: "請求書の読み取りに戻る",
} as const;

export { COPY };

const ABOUT_ID = "about";

const ABOUT_TITLE = "About";

const AVATAR_PATH = "/avatars/masseater.png";

const PREFERENCES = [
  {
    term: "好きなもの",
    items: [
      "超かぐや姫！",
      "自由なインターネット",
      "ニコニコメドレーシリーズ",
      "音MAD",
      "ボカロ",
      "ハースストーン",
      "Slay the Spire",
      "ガンダム",
    ],
  },
  {
    term: "嫌いなもの",
    items: [
      "不自由なインターネット",
      "季節の変わり目",
      "パクチー",
      "自分の感情だけで制限しようとする人",
    ],
  },
] as const;

export { ABOUT_ID, ABOUT_TITLE, AVATAR_PATH, PREFERENCES };

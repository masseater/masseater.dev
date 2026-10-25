const ABOUT_ID = "about";

const ABOUT_TITLE = "About";

const AVATAR_PATH = "/avatars/masseater.png";

const PREFERENCES = [
  {
    term: "好きなもの",
    items: [
      "超かぐや姫！",
      "ニコニコメドレーシリーズ",
      "ボカロ",
      "学園アイドルマスター",
      "ハースストーン",
      "Slay the Spire",
      "ガンダム",
    ],
  },
  {
    term: "嫌いなもの",
    items: [
      "議論で空気が悪くなると無理やり話題を変えること",
      "理由を言わずに意見を変えさせようとすること",
      "称賛しか許されないコメント欄",
      "曲への愛がなく流行りだけで上げる歌ってみた",
      "「〜なので。」「〜かと。」で終わる文",
      "季節の変わり目",
    ],
  },
] as const;

export { ABOUT_ID, ABOUT_TITLE, AVATAR_PATH, PREFERENCES };

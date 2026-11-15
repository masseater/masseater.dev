export const articles = ["laborious-techniques", "video-vj-techniques"] as const;

export type Article = (typeof articles)[number];

export const articleTitles = {
  "laborious-techniques": "印象的だけど作るのが大変な表現技法",
  "video-vj-techniques": "動画・VJ でよく使われる表現の手法集",
} as const satisfies Record<Article, string>;

export const COLLECTION_TITLE = "セイキンダンスで再現する表現技法";

export const blogPath = (article: Article): string => `/blogs/${article}`;

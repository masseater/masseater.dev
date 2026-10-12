const url = "https://masseater.dev";

const xUser = "r_masseater";

const site = {
  url,
  name: "masseater",
  description: "masseater のポートフォリオ。作ったもの、ブログ、スクラップを置いている。",
  locale: "ja",
  ogImage: new URL("/og.png", url).href,
  feedPath: "/feed.xml",
  xHandle: `@${xUser}`,
  links: [
    { label: "GitHub", href: "https://github.com/masseater" },
    { label: "X", href: `https://x.com/${xUser}` },
    { label: "Zenn", href: "https://zenn.dev/masseater" },
  ],
} as const;

export { site };

import { portfolio } from "@masseater.dev/ui/portfolio";

const { url } = portfolio;

const site = {
  url,
  name: portfolio.name,
  description: "masseater のポートフォリオ。作ったもの、ブログ、スクラップを置いている。",
  locale: "ja",
  ogLocale: "ja_JP",
  ogImage: { path: "/og.png", width: 1200, height: 630, type: "image/png" },
  feedPath: "/feed.xml",
  starsApiPath: "/api/stars",
  robotsPath: "/robots.txt",
  sitemapFile: "sitemap.xml",
  externalPaths: ["/decision-bench/"],
  xHandle: `@${portfolio.xUser}`,
  links: portfolio.links,
} as const;

export { site };

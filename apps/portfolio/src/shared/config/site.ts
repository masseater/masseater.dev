import { portfolio } from "@masseater.dev/ui/portfolio";

const url = "https://masseater.dev";

const site = {
  url,
  name: portfolio.name,
  description: "masseater のポートフォリオ。作ったもの、ブログ、スクラップを置いている。",
  locale: "ja",
  ogImage: new URL("/og.png", url).href,
  feedPath: "/feed.xml",
  robotsPath: "/robots.txt",
  sitemapFile: "sitemap.xml",
  externalPaths: ["/decision-bench/"],
  xHandle: `@${portfolio.xUser}`,
  links: portfolio.links,
} as const;

export { site };

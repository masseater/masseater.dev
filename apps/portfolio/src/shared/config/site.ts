const site = {
  url: "https://masseater.dev",
  name: "masseater",
  description: "masseater のポートフォリオ。作ったもの、ブログ、スクラップを置いている。",
  ogImage: "https://masseater.dev/og.png",
  xHandle: "@r_masseater",
  links: [
    { label: "GitHub", href: "https://github.com/masseater" },
    { label: "X", href: "https://x.com/r_masseater" },
    { label: "Zenn", href: "https://zenn.dev/masseater" },
  ],
} as const;

export { site };

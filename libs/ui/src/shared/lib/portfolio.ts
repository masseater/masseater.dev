const xUser = "r_masseater";

export const portfolio = {
  url: "https://masseater.dev",
  name: "masseater",
  xUser,
  links: [
    { label: "GitHub", href: "https://github.com/masseater" },
    { label: "X", href: `https://x.com/${xUser}` },
    { label: "Zenn", href: "https://zenn.dev/masseater" },
  ],
  sections: {
    projects: "Projects",
    blogs: "Blogs",
    slog: "Slog",
    sloppedia: "Sloppedia",
    nikogori: "Nikogori",
    sashi: "Sashi",
    "ai-produced": "AI Produced",
  },
} as const;

const xUser = "r_masseater";

const portfolio = {
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
    scraps: "Scraps",
  },
} as const;

export { portfolio };

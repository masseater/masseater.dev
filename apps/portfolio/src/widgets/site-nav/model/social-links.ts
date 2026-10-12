import { site } from "#/shared/config";

type SocialLink = Readonly<{
  label: string;
  href: string;
  style: Readonly<{ "--vt": string }>;
}>;

const socialLinks: readonly SocialLink[] = site.links.map(({ label, href }) => ({
  label,
  href,
  style: { "--vt": `social-${label.toLowerCase()}` },
}));

export { socialLinks };
export type { SocialLink };

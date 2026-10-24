import { Array as Arr, pipe, String as Str } from "effect";

import { site } from "#/shared/config";

type SocialLink = Readonly<{
  label: string;
  href: string;
  style: Readonly<{ "--vt": string }>;
}>;

const socialLinks: readonly SocialLink[] = pipe(
  site.links,
  Arr.map(({ label, href }) => ({
    label,
    href,
    style: { "--vt": `social-${Str.toLowerCase(label)}` },
  })),
);

export { socialLinks };
export type { SocialLink };

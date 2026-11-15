import { Array as Arr, String as Str, pipe } from "effect";

import { site } from "#/shared/config";

export type SocialLink = Readonly<{
  label: string;
  href: string;
  style: Readonly<{ "--vt": string }>;
}>;

export const socialLinks: readonly SocialLink[] = pipe(
  site.links,
  Arr.map(({ label, href }) => ({
    label,
    href,
    style: { "--vt": `social-${Str.toLowerCase(label)}` },
  })),
);

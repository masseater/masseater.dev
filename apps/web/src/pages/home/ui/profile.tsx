import type { ReactNode } from "react";

import { site } from "#/shared/config";

import { ProfileLinks } from "./profile-links";

const HEADING_ID = "profile";
const BIO = "Web エンジニア。decision model を使った開発ツールやベンチマークを作っている。";

const Profile = (): ReactNode => (
  <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
    <h1 className="font-display text-5xl font-bold tracking-wide" id={HEADING_ID}>
      {site.name}
    </h1>
    <p className="text-muted-foreground">{BIO}</p>
    <ProfileLinks />
  </section>
);

export { Profile };

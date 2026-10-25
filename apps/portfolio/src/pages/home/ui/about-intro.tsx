import type { ReactNode } from "react";

import { ABOUT_ID, ABOUT_TITLE, AVATAR_PATH } from "#/pages/home/model/about";
import { site } from "#/shared/config";

const AVATAR_SIZE = 64;

const AboutIntro = (): ReactNode => (
  <header className="flex flex-col gap-6">
    <h2 className="font-display text-5xl font-light sm:text-7xl" id={`${ABOUT_ID}-title`}>
      {ABOUT_TITLE}
    </h2>
    <div className="flex items-center gap-4">
      <img
        alt=""
        className="rounded-full"
        height={AVATAR_SIZE}
        src={AVATAR_PATH}
        width={AVATAR_SIZE}
      />
      <p className="font-display text-2xl">{site.name}</p>
    </div>
  </header>
);

export { AboutIntro };

import type { ReactNode } from "react";

import { SITE_DESCRIPTION, SITE_NAME } from "#/shared/config";
import { KeywordForm } from "#/shared/ui/keyword-form";

import { StatChips } from "./stat-chips";

const HeroPanel = (): ReactNode => (
  <div className="bg-screen/60 flex w-full max-w-3xl flex-col items-center gap-5 rounded-xl px-4 py-8 text-center backdrop-blur-sm sm:px-8">
    <h1 className="font-display text-shadow-comment text-4xl leading-tight sm:text-6xl">
      {SITE_NAME}
    </h1>
    <p className="text-shadow-comment max-w-xl text-sm sm:text-base">{SITE_DESCRIPTION}</p>
    <div className="w-full max-w-xl">
      <KeywordForm action="/search" label="曲・動画・担当者の名前" keyword="" />
    </div>
    <StatChips />
  </div>
);

export { HeroPanel };

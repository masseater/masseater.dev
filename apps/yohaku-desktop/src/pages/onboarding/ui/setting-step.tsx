import type { ReactNode } from "react";

import { SettingBody } from "./setting-body.tsx";

const TITLE = "作品の設定";

const SettingStep = (): ReactNode => (
  <section aria-label={TITLE} className="flex gap-3 border-b pb-8">
    <h2 className="w-36 shrink-0 font-bold">{TITLE}</h2>
    <SettingBody />
  </section>
);

export { SettingStep };

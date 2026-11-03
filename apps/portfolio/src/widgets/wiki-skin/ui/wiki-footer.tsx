import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { site, wiki } from "#/shared/config";

const LEAD = `${wiki.name}は、`;

const REST =
  "の持ち主と Claude だけが書く、趣味嗜好に偏った百科事典もどきである。検索エンジンには載せていない。";

const WikiFooter = (): ReactNode => (
  <footer className="border-wiki-divider bg-wiki-paper text-wiki-subtle mt-auto border-t text-xs">
    <p className="mx-auto max-w-7xl px-4 py-6 leading-relaxed">
      {LEAD}
      <Link className="text-wiki-link hover:underline" to="/">
        {site.name}
      </Link>
      {REST}
    </p>
  </footer>
);

export { WikiFooter };

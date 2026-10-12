import type { ReactNode } from "react";

import { site } from "#/shared/config";

import { FooterLinks } from "./footer-links";

const COPYRIGHT = `© ${site.name}`;

const SiteFooter = (): ReactNode => (
  <footer className="border-border text-muted-foreground border-t text-sm">
    <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-6">
      <p>{COPYRIGHT}</p>
      <FooterLinks />
    </div>
  </footer>
);

export { SiteFooter };

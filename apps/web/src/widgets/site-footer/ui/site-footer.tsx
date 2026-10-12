import type { ReactNode } from "react";

import { FooterLinks } from "./footer-links";

const SiteFooter = (): ReactNode => (
  <footer className="mx-auto w-full max-w-3xl px-4 py-8">
    <FooterLinks />
  </footer>
);

export { SiteFooter };

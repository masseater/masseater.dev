import type { ReactNode } from "react";

const CREDIT = "Built with PLaMo";

const Credit = (): ReactNode => (
  <footer className="text-muted-foreground px-6 pb-4 text-right text-xs">{CREDIT}</footer>
);

export { Credit };

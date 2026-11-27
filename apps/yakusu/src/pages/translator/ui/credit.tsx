import { PageFooter } from "@masseater.dev/ui/page-footer";
import type { ReactNode } from "react";

const CREDIT = "Built with PLaMo";

export const Credit = (): ReactNode => <PageFooter variant="credit">{CREDIT}</PageFooter>;

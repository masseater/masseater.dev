import { PageHeader } from "@masseater.dev/ui/page-header";
import type { ReactNode } from "react";

import { COPY } from "#/pages/why/model/copy.ts";

import { Actions } from "./actions.tsx";
import { Example } from "./example.tsx";

export const Intro = (): ReactNode => (
  <PageHeader layout="stacked" title={COPY.title}>
    <Example />
    <Actions />
  </PageHeader>
);

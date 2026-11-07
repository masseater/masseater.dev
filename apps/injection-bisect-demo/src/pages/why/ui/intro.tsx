import type { ReactNode } from "react";

import { COPY } from "#/pages/why/model/copy";

import { Actions } from "./actions";
import { Example } from "./example";

const Intro = (): ReactNode => (
  <header className="flex flex-col gap-5">
    <h1 className="text-3xl leading-tight font-bold md:text-4xl">{COPY.title}</h1>
    <Example />
    <Actions />
  </header>
);

export { Intro };

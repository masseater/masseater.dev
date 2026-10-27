import { getRouteApi } from "@tanstack/react-router";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { techniqueOf } from "#/entities/technique";

import { TechniqueView } from "./technique-view";

const route = getRouteApi("/_site/seikin-techniques/$slug");

const TechniquePage = (): ReactNode => {
  const { slug, shader } = route.useLoaderData();
  return pipe(
    techniqueOf(slug),
    Option.toArray,
    Arr.map((technique) => (
      <TechniqueView key={technique.slug} shader={shader} technique={technique} />
    )),
  );
};

export { TechniquePage };

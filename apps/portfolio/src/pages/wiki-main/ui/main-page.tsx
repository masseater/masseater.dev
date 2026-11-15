import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MainView } from "sloppedia";

import { wiki } from "#/shared/wiki/index.ts";

const route = getRouteApi("/sloppedia/");

export const MainPage = (): ReactNode => {
  const { entries } = route.useLoaderData();
  return <MainView articles={entries} config={wiki} />;
};

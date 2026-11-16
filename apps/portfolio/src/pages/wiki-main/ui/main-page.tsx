import { MainView } from "@masseater.dev/sloppedia";
import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { wiki } from "#/shared/wiki";

const route = getRouteApi("/sloppedia/");

export const MainPage = (): ReactNode => {
  const { entries } = route.useLoaderData();
  return <MainView articles={entries} config={wiki} />;
};

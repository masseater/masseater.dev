import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MainView } from "sloppedia";

import { wiki } from "#/shared/config";

const route = getRouteApi("/sloppedia/");

const MainPage = (): ReactNode => {
  const { entries } = route.useLoaderData();
  return <MainView articles={entries} config={wiki} />;
};

export { MainPage };

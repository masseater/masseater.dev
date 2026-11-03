import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { MainView } from "./main-view";

const route = getRouteApi("/sloppedia/");

const MainPage = (): ReactNode => {
  const { entries } = route.useLoaderData();
  return <MainView entries={entries} />;
};

export { MainPage };

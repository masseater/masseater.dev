import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { KeywordForm } from "#/shared/ui/keyword-form";
import { PageTitle } from "#/shared/ui/page-title";

import { PeopleTable } from "./people-table";

const TITLE = "担当者";
const DESCRIPTION = "パートを担当した人の一覧です。";

const route = getRouteApi("/people/");

const PeoplePage = (): ReactNode => {
  const { keyword } = route.useSearch();
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={TITLE} description={DESCRIPTION} />
      <div className="max-w-xl">
        <KeywordForm action="/people" label="名前・別名義" keyword={keyword} />
      </div>
      <PeopleTable />
    </div>
  );
};

export { PeoplePage };

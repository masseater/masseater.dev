import { Array } from "effect";
import type { ReactNode } from "react";

import { usePackages } from "#/pages/home/api/queries";

import { Assets } from "./assets.tsx";
import { FirstImport } from "./first-import.tsx";
import { ResultDetail } from "./result-detail.tsx";
import { ScopeHeader } from "./scope-header.tsx";

const HomeBody = (): ReactNode => {
  const packages = usePackages();
  if (packages.isSuccess && Array.isReadonlyArrayEmpty(packages.data)) {
    return <FirstImport />;
  }
  return (
    <div className="flex min-h-0 flex-1 gap-6">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
        <ScopeHeader />
        <Assets />
      </div>
      <ResultDetail />
    </div>
  );
};

export { HomeBody };

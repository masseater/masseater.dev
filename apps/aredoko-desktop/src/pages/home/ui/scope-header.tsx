import { Option } from "effect";
import type { ReactNode } from "react";

import { usePackage, useSelectedPackage, PackageSummary } from "#/entities/asset";
import { BoothSection } from "#/features/link-booth";

import { PackageHeader } from "./package-header.tsx";

export const ScopeHeader = (): ReactNode => {
  const item = usePackage(useSelectedPackage());
  if (Option.isNone(item)) {
    return false;
  }
  return (
    <section className="bg-card flex shrink-0 flex-wrap gap-6 rounded-lg border p-4">
      <div className="flex min-w-64 flex-1 flex-col gap-3">
        <PackageHeader item={item.value} />
        <PackageSummary summary={item.value.summary} />
      </div>
      <div className="w-80">
        <BoothSection item={item.value} />
      </div>
    </section>
  );
};

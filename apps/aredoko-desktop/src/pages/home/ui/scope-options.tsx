import { Array, pipe } from "effect";
import { Select } from "radix-ui";
import type { ReactNode } from "react";

import { usePackages } from "#/pages/home/api/queries";

import { ALL_PACKAGES, ScopeOption } from "./scope-option.tsx";

const ALL_LABEL = "すべてのパッケージ";

const ScopeOptions = (): ReactNode => {
  const packages = usePackages();
  return (
    <Select.Viewport className="p-1">
      <ScopeOption value={ALL_PACKAGES} label={ALL_LABEL} count="" />
      {pipe(
        packages.data ?? [],
        Array.map((item) => (
          <ScopeOption
            key={item.id}
            value={item.id.toString()}
            label={item.name}
            count={item.assets.toString()}
          />
        )),
      )}
    </Select.Viewport>
  );
};

export { ScopeOptions };

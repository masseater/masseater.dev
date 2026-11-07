import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useAssets, useLoadNext } from "#/pages/home/api/queries";
import { useKinds, useSelectedPackage } from "#/pages/home/model";
import { Loading } from "#/shared/ui/loading";
import { Notice } from "#/shared/ui/notice";

import { NextPageTrigger } from "./next-page-trigger.tsx";
import { NothingFound } from "./nothing-found.tsx";
import { ResultGrid } from "./result-grid.tsx";

const EMPTY = "該当するアセットがありません";

const AssetBrowser = (): ReactNode => {
  const assets = useAssets({ packageId: useSelectedPackage(), kinds: useKinds() });
  const onEnd = useLoadNext(assets);
  if (assets.isPending) {
    return <Loading />;
  }
  if (assets.isError) {
    return <Notice tone="error">{assets.error.message}</Notice>;
  }
  const results = pipe(
    assets.data.pages,
    Array.flatMap(({ assets: page }) => page),
  );
  if (Array.isReadonlyArrayEmpty(results)) {
    return <NothingFound text={EMPTY} />;
  }
  return (
    <>
      <ResultGrid results={results} />
      <NextPageTrigger onVisible={onEnd} />
    </>
  );
};

export { AssetBrowser };

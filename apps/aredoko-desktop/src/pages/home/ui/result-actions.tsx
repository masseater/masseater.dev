import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import { Option } from "effect";
import type { ReactNode } from "react";

import { ImportToUnityButton } from "./import-to-unity-button.tsx";
import { OpenerButton } from "./opener-button.tsx";
import { ShowPackageButton } from "./show-package-button.tsx";
import { useResultLinks } from "./use-result-links.ts";

const ResultActions = ({ result }: Readonly<{ result: typeof SearchResult.Type }>): ReactNode => {
  const { file, revealed, booth } = useResultLinks(result);
  return (
    <div className="flex flex-col gap-2">
      <ImportToUnityButton assetId={result.assetId} />
      {Option.isSome(file) && <OpenerButton opens="file" target={file.value} />}
      {Option.isSome(revealed) && <OpenerButton opens="reveal" target={revealed.value} />}
      <ShowPackageButton id={result.packageId} />
      {Option.isSome(booth) && <OpenerButton opens="booth" target={booth.value} />}
    </div>
  );
};

export { ResultActions };

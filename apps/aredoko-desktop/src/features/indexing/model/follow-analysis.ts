import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useQueryClient } from "@tanstack/react-query";
import { Effect, HashSet, Option } from "effect";
import { Atom } from "effect/reactivity";
import { useEffect } from "react";

import { ASSETS_KEY, useStatus } from "#/shared/api";

const scannedAtom = Atom.make(HashSet.empty<number>());

const useFollowAnalysis = (): void => {
  const client = useQueryClient();
  const status = useStatus();
  const setScanned = useAtomSet(scannedAtom);
  const { data } = status;
  const analyzed = status.isSuccess && status.data.images.done;
  useEffect(() => {
    if (analyzed !== false) {
      Effect.runFork(Effect.promise(() => client.invalidateQueries({ queryKey: ASSETS_KEY })));
    }
  }, [analyzed, client]);
  useEffect(() => {
    const current = Option.fromUndefinedOr(data);
    if (Option.isNone(current)) {
      return;
    }
    const { indexing, analyzingAssetIds } = current.value;
    if (!indexing) {
      setScanned(HashSet.empty());
      return;
    }
    setScanned((scanned) => HashSet.union(scanned, HashSet.fromIterable(analyzingAssetIds)));
  }, [data, setScanned]);
};

const useAnalysis = ({
  assetId,
  analyzing,
}: Readonly<{ assetId: number; analyzing: boolean }>): Readonly<{
  waiting: boolean;
  now: boolean;
}> => {
  const status = useStatus();
  const scanned = useAtomValue(scannedAtom);
  const now = status.isSuccess && status.data.analyzingAssetIds.includes(assetId);
  return { waiting: analyzing && !now && !HashSet.has(scanned, assetId), now };
};

export { useAnalysis, useFollowAnalysis };

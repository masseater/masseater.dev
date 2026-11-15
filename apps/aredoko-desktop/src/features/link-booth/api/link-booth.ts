import type { Package } from "@masseater.dev/aredoko-protocol";
import { useMutation } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";

import { linkBooth, useRefreshLibrary } from "#/shared/api";

const useLinkBooth = (): UseMutationResult<
  typeof Package.Type,
  Error,
  Readonly<{ packageId: number; url: string }>
> => {
  const refresh = useRefreshLibrary();
  return useMutation({ mutationFn: linkBooth, onSuccess: refresh });
};

export { useLinkBooth };

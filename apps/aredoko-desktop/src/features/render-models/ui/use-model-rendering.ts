import { useEffect } from "react";

import { startRendering } from "#/features/render-models/api/render-loop.ts";

export const useModelRendering = (): void => {
  useEffect(startRendering, []);
};

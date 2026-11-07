import { useEffect } from "react";

import { startRendering } from "#/features/render-models/api/render-loop";

const useModelRendering = (): void => {
  useEffect(startRendering, []);
};

export { useModelRendering };

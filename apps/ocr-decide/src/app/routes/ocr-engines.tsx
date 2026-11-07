import { createFileRoute } from "@tanstack/react-router";

import { OcrEnginesPage, jaBenchQuery } from "#/pages/ocr-engines";

const Route = createFileRoute("/ocr-engines")({
  loader: ({ context }) => context.queryClient.query(jaBenchQuery),
  component: OcrEnginesPage,
});

export { Route };

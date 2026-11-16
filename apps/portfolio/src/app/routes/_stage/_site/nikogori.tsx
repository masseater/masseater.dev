import { createFileRoute } from "@tanstack/react-router";

import { nikogoriHead, NikogoriPage } from "#/pages/nikogori/index.ts";

export const Route = createFileRoute("/_stage/_site/nikogori")({
  head: nikogoriHead,
  component: NikogoriPage,
});

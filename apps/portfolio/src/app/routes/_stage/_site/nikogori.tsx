import { createFileRoute } from "@tanstack/react-router";

import { nikogoriHead, NikogoriPage } from "#/pages/nikogori";

const Route = createFileRoute("/_stage/_site/nikogori")({
  head: nikogoriHead,
  component: NikogoriPage,
});

export { Route };

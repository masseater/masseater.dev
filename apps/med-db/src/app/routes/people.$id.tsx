import { createFileRoute } from "@tanstack/react-router";

import { PersonPage, loadPersonPage } from "#/pages/person/index.ts";
import { idParams } from "#/shared/lib/id-params.ts";

export const Route = createFileRoute("/people/$id")({
  params: idParams,
  loader: ({ context, params }) =>
    loadPersonPage({ queryClient: context.queryClient, id: params.id }),
  component: PersonPage,
});

import { Schema } from "effect";

import { createRouter, IdParams, respondFound } from "#/shared/api/index.server";
import { keywordOf } from "#/shared/db/index.server";
import { TextSearch } from "#/shared/lib/text-search";
import { runRequest } from "#/shared/observability/index.server";

import { listPeople } from "./people.server.ts";
import { getPerson } from "./person.server.ts";

export const personRoutes = createRouter("/people")
  .get("/", ({ query }) => runRequest(keywordOf(query.keyword).pipe(listPeople)), {
    query: Schema.toStandardSchemaV1(TextSearch),
  })
  .get("/:id", ({ params }) => respondFound(getPerson(params.id)), { params: IdParams });

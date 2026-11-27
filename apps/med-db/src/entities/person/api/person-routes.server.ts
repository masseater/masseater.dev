import { Schema } from "effect";

import { createRouter, IdParams, respondFound, respond } from "#/shared/api/index.server.ts";
import { keywordOf } from "#/shared/db/index.server.ts";
import { TextSearch } from "#/shared/lib/text-search.ts";

import { listPeople } from "./people.server.ts";
import { getPerson } from "./person.server.ts";

export const personRoutes = createRouter("/people")
  .get("/", ({ query, request }) => respond(request)(keywordOf(query.keyword).pipe(listPeople)), {
    query: Schema.toStandardSchemaV1(TextSearch),
  })
  .get("/:id", ({ params, request }) => respondFound(request)(getPerson(params.id)), {
    params: IdParams,
  });

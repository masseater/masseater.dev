import { Schema } from "effect";

import { createRouter } from "#/shared/api/index.server";
import { TextSearch } from "#/shared/lib/text-search";
import { runRequest } from "#/shared/observability/index.server";

import { keywordOf } from "./db.server";
import { listPeople } from "./people.server";
import { getPerson } from "./person.server";
import { IdParams, respondFound } from "./respond.server";

const personRoutes = createRouter("/people")
  .get("/", ({ query }) => runRequest(keywordOf(query.keyword).pipe(listPeople)), {
    query: Schema.toStandardSchemaV1(TextSearch),
  })
  .get("/:id", ({ params }) => respondFound(getPerson(params.id)), { params: IdParams });

export { personRoutes };

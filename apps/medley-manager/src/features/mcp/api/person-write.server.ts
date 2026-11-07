import { eq } from "drizzle-orm";
import { Effect, pipe } from "effect";

import type { PersonDetail } from "#/entities/catalog";
import {
  catalogDb,
  getPerson,
  partStaff,
  person,
  personAlias,
} from "#/entities/catalog/index.server";

import { ToolError } from "./tool-error";
import type { MergeInput } from "./tool-input";
import { orMissing, query } from "./tool-result.server";

const PERSON_MISSING = "person not found";
const SAME_PERSON = "sourceId and targetId must differ";

const personDetail = (id: number): Effect.Effect<PersonDetail, ToolError> =>
  getPerson(id).pipe(orMissing(PERSON_MISSING));

const mergePeople = Effect.fn("mcp.person.merge")(function* mergePeople(
  input: typeof MergeInput.Type,
) {
  if (input.sourceId === input.targetId) {
    return yield* ToolError.make({ message: SAME_PERSON });
  }
  const source = yield* personDetail(input.sourceId);
  yield* personDetail(input.targetId);
  const credits = yield* query(() =>
    catalogDb
      .select({ partId: partStaff.partId, role: partStaff.role })
      .from(partStaff)
      .where(eq(partStaff.personId, input.sourceId)),
  );
  yield* pipe(
    credits,
    Effect.forEach((credit) =>
      query(() =>
        catalogDb
          .insert(partStaff)
          .values({ partId: credit.partId, role: credit.role, personId: input.targetId })
          .onConflictDoNothing(),
      ),
    ),
  );
  yield* pipe(
    [source.name, ...source.aliases],
    Effect.forEach((alias) =>
      query(() =>
        catalogDb
          .insert(personAlias)
          .values({ personId: input.targetId, alias })
          .onConflictDoNothing(),
      ),
    ),
  );
  yield* query(() => catalogDb.delete(person).where(eq(person.id, input.sourceId)));
  return yield* personDetail(input.targetId);
});

export { mergePeople };

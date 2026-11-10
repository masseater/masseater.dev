import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Effect, pipe } from "effect";

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

type Statement = BatchItem<"sqlite">;
type Credit = Pick<typeof partStaff.$inferSelect, "partId" | "role">;

const PERSON_MISSING = "person not found";
const SAME_PERSON = "sourceId and targetId must differ";

const personDetail = (id: number): Effect.Effect<PersonDetail, ToolError> =>
  getPerson(id).pipe(orMissing(PERSON_MISSING));

const creditInserts = (personId: number, credits: readonly Credit[]): readonly Statement[] =>
  pipe(
    credits,
    Arr.map((credit) =>
      catalogDb
        .insert(partStaff)
        .values({ ...credit, personId })
        .onConflictDoNothing(),
    ),
  );

const aliasInserts = (personId: number, aliases: readonly string[]): readonly Statement[] =>
  pipe(
    aliases,
    Arr.map((alias) =>
      catalogDb.insert(personAlias).values({ personId, alias }).onConflictDoNothing(),
    ),
  );

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
  const removal: Statement = catalogDb.delete(person).where(eq(person.id, input.sourceId));
  const statements = pipe(
    [
      ...creditInserts(input.targetId, credits),
      ...aliasInserts(input.targetId, [source.name, ...source.aliases]),
    ],
    Arr.append(removal),
  );
  yield* query(() => catalogDb.batch(statements));
  return yield* personDetail(input.targetId);
});

export { mergePeople };

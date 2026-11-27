import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Array as Arr, Effect, pipe } from "effect";

import type { PersonDetail, MergeInput } from "#/entities/catalog/index.ts";
import { getPerson } from "#/entities/person/index.server.ts";
import { orMissing, query } from "#/shared/api/index.server.ts";
import { ToolError } from "#/shared/api/index.ts";
import type { CatalogRelations, CatalogDb } from "#/shared/db/index.server.ts";
import { partStaff, person, personAlias } from "#/shared/db/index.ts";

type Statement = BatchItem<"sqlite">;
type Credit = Pick<typeof partStaff.$inferSelect, "partId" | "role">;

const PERSON_MISSING = "person not found";
const SAME_PERSON = "sourceId and targetId must differ";

const personDetail = (id: number): Effect.Effect<PersonDetail, ToolError, CatalogDb> =>
  getPerson(id).pipe(orMissing(PERSON_MISSING));

const creditInserts =
  (db: DrizzleD1Database<CatalogRelations>) =>
  (personId: number, credits: readonly Credit[]): readonly Statement[] =>
    pipe(
      credits,
      Arr.map((credit) =>
        db
          .insert(partStaff)
          .values({ ...credit, personId })
          .onConflictDoNothing(),
      ),
    );

const aliasInserts =
  (db: DrizzleD1Database<CatalogRelations>) =>
  (personId: number, aliases: readonly string[]): readonly Statement[] =>
    pipe(
      aliases,
      Arr.map((alias) => db.insert(personAlias).values({ personId, alias }).onConflictDoNothing()),
    );

export const mergePeople = Effect.fn("mcp.person.merge")(function* mergePeople(
  input: typeof MergeInput.Type,
) {
  if (input.sourceId === input.targetId) {
    return yield* ToolError.make({ message: SAME_PERSON });
  }
  const source = yield* personDetail(input.sourceId);
  yield* personDetail(input.targetId);
  const credits = yield* query((db) =>
    db
      .select({ partId: partStaff.partId, role: partStaff.role })
      .from(partStaff)
      .where(eq(partStaff.personId, input.sourceId)),
  );
  yield* query((db) => {
    const removal: Statement = db.delete(person).where(eq(person.id, input.sourceId));
    const statements = pipe(
      [
        ...creditInserts(db)(input.targetId, credits),
        ...aliasInserts(db)(input.targetId, [source.name, ...source.aliases]),
      ],
      Arr.append(removal),
    );
    return db.batch(statements);
  });
  return yield* personDetail(input.targetId);
});

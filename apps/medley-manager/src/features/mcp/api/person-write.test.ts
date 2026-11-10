import { afterAll, expect, it } from "@effect/vitest";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { vi } from "vite-plus/test";

import {
  catalogDb,
  part,
  partStaff,
  person,
  personAlias,
  video,
} from "#/entities/catalog/index.server";

import { closeDatabase, resetDatabase } from "./d1.test.support";
import { mergePeople } from "./person-write.server";
import { whileRejecting } from "./rejecting.test.support";

vi.mock("cloudflare:workers", () => import("./d1.test.support"));

afterAll(() => Effect.runPromise(closeDatabase));

const PERSON_MISSING = "person not found";

const SAME_PERSON = "sourceId and targetId must differ";

const FIRST = 1;

const SECOND = 2;

const UNKNOWN_PERSON_ID = 999_999;

const SOURCE_NAME = "消す人";

const TARGET_NAME = "残す人";

const addPerson = (name: string, alias: string): Effect.Effect<number> =>
  Effect.gen(function* insertPerson() {
    const created = yield* Effect.promise(() =>
      catalogDb.insert(person).values({ name }).returning({ id: person.id }).get(),
    );
    yield* Effect.promise(() =>
      catalogDb.insert(personAlias).values({ personId: created.id, alias }),
    );
    return created.id;
  });

const addPart = (videoId: number, position: number): Effect.Effect<number> =>
  Effect.promise(() =>
    catalogDb
      .insert(part)
      .values({ videoId, position, label: `パート ${position.toString()}` })
      .returning({ id: part.id })
      .get(),
  ).pipe(Effect.map((row) => row.id));

const seedPeople = Effect.gen(function* seedPeople() {
  yield* resetDatabase;
  const sourceId = yield* addPerson(SOURCE_NAME, "消す人の別名");
  const targetId = yield* addPerson(TARGET_NAME, "残す人の別名");
  const medley = yield* Effect.promise(() =>
    catalogDb
      .insert(video)
      .values({ title: "テストメドレー", url: "https://example.com/watch/1" })
      .returning({ id: video.id })
      .get(),
  );
  const intro = yield* addPart(medley.id, FIRST);
  const chorus = yield* addPart(medley.id, SECOND);
  yield* Effect.promise(() =>
    catalogDb.insert(partStaff).values([
      { partId: intro, personId: sourceId, role: "audio" },
      { partId: intro, personId: targetId, role: "audio" },
      { partId: intro, personId: sourceId, role: "video" },
      { partId: chorus, personId: sourceId, role: "audio" },
    ]),
  );
  return { sourceId, targetId };
});

const stored = Effect.all({
  people: Effect.promise(() =>
    catalogDb.select({ name: person.name }).from(person).orderBy(person.id),
  ),
  aliases: Effect.promise(() =>
    catalogDb
      .select({ name: person.name, alias: personAlias.alias })
      .from(personAlias)
      .innerJoin(person, eq(person.id, personAlias.personId))
      .orderBy(person.id, personAlias.alias),
  ),
  credits: Effect.promise(() =>
    catalogDb
      .select({ position: part.position, role: partStaff.role, name: person.name })
      .from(partStaff)
      .innerJoin(part, eq(part.id, partStaff.partId))
      .innerJoin(person, eq(person.id, partStaff.personId))
      .orderBy(part.position, partStaff.role, person.id),
  ),
});

const SEEDED = {
  people: [{ name: SOURCE_NAME }, { name: TARGET_NAME }],
  aliases: [
    { name: SOURCE_NAME, alias: "消す人の別名" },
    { name: TARGET_NAME, alias: "残す人の別名" },
  ],
  credits: [
    { position: FIRST, role: "audio", name: SOURCE_NAME },
    { position: FIRST, role: "audio", name: TARGET_NAME },
    { position: FIRST, role: "video", name: SOURCE_NAME },
    { position: SECOND, role: "audio", name: SOURCE_NAME },
  ],
};

const MERGED = {
  people: [{ name: TARGET_NAME }],
  aliases: [
    { name: TARGET_NAME, alias: "残す人の別名" },
    { name: TARGET_NAME, alias: SOURCE_NAME },
    { name: TARGET_NAME, alias: "消す人の別名" },
  ],
  credits: [
    { position: FIRST, role: "audio", name: TARGET_NAME },
    { position: FIRST, role: "video", name: TARGET_NAME },
    { position: SECOND, role: "audio", name: TARGET_NAME },
  ],
};

it.effect("mergePeople は消す側の担当と名前と別名義を残す側へ移し、消す側を消す", () =>
  Effect.gen(function* movesEverything() {
    const ids = yield* seedPeople;
    const merged = yield* mergePeople(ids);
    expect(merged.id).toBe(ids.targetId);
    const after = yield* stored;
    expect(after).toStrictEqual(MERGED);
  }),
);

it.effect("mergePeople は別名義の追加を D1 が拒むと、担当を移さず元のまま残す", () =>
  Effect.gen(function* keepsCreditsOnAliasFailure() {
    const ids = yield* seedPeople;
    yield* mergePeople(ids).pipe(
      whileRejecting({ event: "INSERT", table: "person_alias" }),
      Effect.flip,
    );
    const after = yield* stored;
    expect(after).toStrictEqual(SEEDED);
  }),
);

it.effect("mergePeople は消す側の削除を D1 が拒むと、担当も別名義も元のまま残す", () =>
  Effect.gen(function* keepsEverythingOnDeleteFailure() {
    const ids = yield* seedPeople;
    yield* mergePeople(ids).pipe(whileRejecting({ event: "DELETE", table: "person" }), Effect.flip);
    const after = yield* stored;
    expect(after).toStrictEqual(SEEDED);
  }),
);

it.effect("mergePeople は同じ人どうしや居ない人を指すと失敗し、何も書き換えない", () =>
  Effect.gen(function* rejectsBadInput() {
    const ids = yield* seedPeople;
    const same = yield* mergePeople({ sourceId: ids.targetId, targetId: ids.targetId }).pipe(
      Effect.flip,
    );
    const missing = yield* mergePeople({
      sourceId: ids.sourceId,
      targetId: UNKNOWN_PERSON_ID,
    }).pipe(Effect.flip);
    expect(same.message).toBe(SAME_PERSON);
    expect(missing.message).toBe(PERSON_MISSING);
    const after = yield* stored;
    expect(after).toStrictEqual(SEEDED);
  }),
);

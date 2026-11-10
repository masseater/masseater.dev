import { afterAll, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, pipe, String as Str } from "effect";
import type { Cause } from "effect";
import { vi } from "vite-plus/test";

import { catalogDb, getVideo, partStaff, video } from "#/entities/catalog/index.server";
import { closeDatabase, resetDatabase } from "#/shared/db/d1.test.support";

import { addParts, setVideoParts, updatePart } from "./part-write.server";
import type { VideoPartsInput } from "./tool-input";

vi.mock("cloudflare:workers", () => import("#/shared/db/d1.test.support"));

afterAll(() => Effect.runPromise(closeDatabase));

type Parts = (typeof VideoPartsInput.Type)["parts"];

type Stored = Readonly<{
  id: number;
  position: number;
  label: string | null;
  songs: readonly string[];
  staff: readonly string[];
}>;

const NO_MATERIAL = "each part needs a song, a quoted video or a label";

const REJECTED_BY_DATABASE = "Failed to execute statement";

const FIRST = 1;

const SECOND = 2;

const REPLACED_STAFF_ROWS = 3;

const INTRO = {
  songTitle: "元の曲",
  label: "イントロ",
  audioStaff: ["元の音声"],
  videoStaff: ["元の映像"],
};

const CHORUS = { label: "サビ", audioStaff: ["元の音声"], videoStaff: ["元の映像"] };

const ORIGINAL_PARTS = [INTRO, CHORUS];

const ORIGINAL_INTRO = {
  position: FIRST,
  label: "イントロ",
  songs: ["元の曲"],
  staff: ["audio:元の音声", "video:元の映像"],
};

const ORIGINAL_CHORUS = {
  position: SECOND,
  label: "サビ",
  songs: [],
  staff: ["audio:元の音声", "video:元の映像"],
};

const ORIGINAL_STORED = [ORIGINAL_INTRO, ORIGINAL_CHORUS];

const NEW_INTRO = {
  songTitle: "新しい曲",
  label: "新イントロ",
  audioStaff: ["新しい音声"],
  videoStaff: ["新しい映像"],
};

const NEW_CHORUS = { label: "新サビ", audioStaff: ["新しい音声"] };

const UNKNOWN_SONG_ID = 999_999;

const UNKNOWN_SONG = { label: "無い曲", songId: UNKNOWN_SONG_ID, audioStaff: ["新しい音声"] };

const seedVideo = resetDatabase.pipe(
  Effect.andThen(
    Effect.promise(() =>
      catalogDb
        .insert(video)
        .values({ title: "テストメドレー", url: "https://example.com/watch/1" })
        .returning({ id: video.id })
        .get(),
    ),
  ),
  Effect.map((row) => row.id),
);

const storedParts = (videoId: number): Effect.Effect<readonly Stored[], Cause.NoSuchElementError> =>
  getVideo(videoId).pipe(
    Effect.flatMap(Effect.fromOption),
    Effect.map((found) =>
      pipe(
        found.parts,
        Arr.map((stored) => ({
          id: stored.id,
          position: stored.position,
          label: stored.label,
          songs: pipe(
            Arr.fromNullishOr(stored.song),
            Arr.map((song) => song.title),
          ),
          staff: Arr.sort(
            pipe(
              stored.staff,
              Arr.map((member) => `${member.role}:${member.person.name}`),
            ),
            Str.Order,
          ),
        })),
      ),
    ),
  );

const rejectionOf = (
  write: typeof setVideoParts,
  parts: Parts,
): Effect.Effect<string, Cause.NoSuchElementError> =>
  Effect.gen(function* keepsParts() {
    const videoId = yield* seedVideo;
    yield* setVideoParts({ videoId, parts: ORIGINAL_PARTS }).pipe(Effect.orDie);
    const before = yield* storedParts(videoId);
    const failure = yield* write({ videoId, parts }).pipe(Effect.flip, Effect.orDie);
    const after = yield* storedParts(videoId);
    expect(before).toMatchObject(ORIGINAL_STORED);
    expect(after).toStrictEqual(before);
    return failure.message;
  });

it.effect("setVideoParts は既存のパートと担当を新しいものに入れ替える", () =>
  Effect.gen(function* replacesParts() {
    const videoId = yield* seedVideo;
    yield* setVideoParts({ videoId, parts: ORIGINAL_PARTS });
    yield* setVideoParts({ videoId, parts: [NEW_INTRO, NEW_CHORUS] });
    const stored = yield* storedParts(videoId);
    const staffRows = yield* Effect.promise(() =>
      catalogDb.select({ id: partStaff.id }).from(partStaff).all(),
    );
    expect(stored).toMatchObject([
      {
        position: FIRST,
        label: "新イントロ",
        songs: ["新しい曲"],
        staff: ["audio:新しい音声", "video:新しい映像"],
      },
      { position: SECOND, label: "新サビ", songs: [], staff: ["audio:新しい音声"] },
    ]);
    expect(staffRows).toHaveLength(REPLACED_STAFF_ROWS);
  }),
);

it.effect("setVideoParts は素材の無いパートが混じると失敗し、元のパートと担当を残す", () =>
  Effect.gen(function* keepsPartsOnSet() {
    const message = yield* rejectionOf(setVideoParts, [NEW_INTRO, {}, NEW_CHORUS]);
    expect(message).toBe(NO_MATERIAL);
  }),
);

it.effect("addParts は素材の無いパートが混じると失敗し、パートを 1 つも足さない", () =>
  Effect.gen(function* keepsPartsOnAdd() {
    const message = yield* rejectionOf(addParts, [NEW_INTRO, {}, NEW_CHORUS]);
    expect(message).toBe(NO_MATERIAL);
  }),
);

it.effect("setVideoParts は batch の途中で D1 が拒むと、元のパートと担当を残す", () =>
  Effect.gen(function* keepsPartsOnBatchFailure() {
    const message = yield* rejectionOf(setVideoParts, [NEW_INTRO, UNKNOWN_SONG]);
    expect(message).toBe(REJECTED_BY_DATABASE);
  }),
);

it.effect("updatePart は指定したパートの音声の担当だけを入れ替える", () =>
  Effect.gen(function* replacesAudioStaff() {
    const videoId = yield* seedVideo;
    yield* addParts({ videoId, parts: [INTRO] });
    yield* addParts({ videoId, parts: [CHORUS] });
    const target = yield* storedParts(videoId).pipe(
      Effect.map(Arr.last),
      Effect.flatMap(Effect.fromOption),
    );
    yield* updatePart({ partId: target.id, audioStaff: ["差し替えた音声"] });
    const stored = yield* storedParts(videoId);
    expect(stored).toMatchObject([
      ORIGINAL_INTRO,
      { ...ORIGINAL_CHORUS, staff: ["audio:差し替えた音声", "video:元の映像"] },
    ]);
  }),
);

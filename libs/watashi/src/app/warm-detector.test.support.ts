import { Effect } from "effect";
import { beforeAll } from "vite-plus/test";

import { secretDetector } from "#/features/push-session/index.ts";

const FIRST_BUILD_LIMIT = 600_000;

beforeAll(() => Effect.runPromise(secretDetector), FIRST_BUILD_LIMIT);

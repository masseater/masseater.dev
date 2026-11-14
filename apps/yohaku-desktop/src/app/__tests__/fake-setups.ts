import type { ClaudeStatus, Release } from "#/shared/api";

import { fakeWith } from "./fake-yohaku.ts";
import type { Fake } from "./fake-yohaku.ts";

const firstRun = (claude: ClaudeStatus): Fake => fakeWith({ onboarding: [], claude });

const ideaHintPending = (): Fake => fakeWith({ onboarding: ["setup", "source-hint"] });

const updateReady = (release: Release): Fake => fakeWith({ release });

export { firstRun, ideaHintPending, updateReady };

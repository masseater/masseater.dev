import type { ClaudeStatus, Release } from "#/shared/api";

import { fakeWith } from "./fake-yohaku.test.support.ts";
import type { Fake } from "./fake-yohaku.test.support.ts";

export const firstRun = (claude: ClaudeStatus): Fake => fakeWith({ onboarding: [], claude });

export const ideaHintPending = (): Fake => fakeWith({ onboarding: ["setup", "source-hint"] });

export const updateReady = (release: Release): Fake => fakeWith({ release });

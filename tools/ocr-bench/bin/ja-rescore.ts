import { runMain } from "@effect/platform-node/NodeRuntime";

import { resultsLayer } from "#/entities/bench/index.ts";
import { writeReport } from "#/features/report-bench/index.ts";
import { provideAtEntry } from "#/shared/lib/ocr-tooling.ts";

runMain(writeReport.pipe(provideAtEntry(resultsLayer)));

import { NodeRuntime } from "@effect/platform-node";

import { resultsLayer } from "#/entities/bench/index.ts";
import { writeReport } from "#/features/report-bench/index.ts";
import { provideAtEntry } from "#/shared/lib/ocr-tooling.ts";

NodeRuntime.runMain(writeReport.pipe(provideAtEntry(resultsLayer)));

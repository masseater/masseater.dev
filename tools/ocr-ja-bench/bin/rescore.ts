import { NodeRuntime } from "@effect/platform-node";
import { provideAtEntry } from "@ocr-decide/tooling";

import { resultsLayer } from "#/entities/bench/index.ts";
import { writeReport } from "#/features/report-bench/index.ts";

NodeRuntime.runMain(writeReport.pipe(provideAtEntry(resultsLayer)));

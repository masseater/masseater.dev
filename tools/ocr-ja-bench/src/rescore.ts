import { NodeRuntime } from "@effect/platform-node";
import { provideAtEntry } from "@ocr-decide/tooling";

import { writeReport } from "./report.ts";
import { resultsLayer } from "./results.ts";

NodeRuntime.runMain(writeReport.pipe(provideAtEntry(resultsLayer)));

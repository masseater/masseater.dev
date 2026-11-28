import { runMain } from "@r_masseater/node-main";
import { Effect } from "effect";

import { lap } from "#/app/lap.ts";

lap.pipe(Effect.scoped, runMain("lap"));

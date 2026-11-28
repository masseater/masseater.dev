import { run } from "@r_masseater/workers-tracing/effect";
import { Effect } from "effect";

import { references } from "#/entities/reference/model/references.ts";

export const referencesResponse = (): Promise<Response> =>
  run(references.pipe(Effect.map((found) => Response.json({ references: found }))));

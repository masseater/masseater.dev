import { PORTAL_ACTOR } from "@masseater.dev/portal-protocol";
import { Effect } from "effect";

import type { ToolFailure } from "#/features/mcp/model/tool-failure";

import { LifeReadInput } from "./life-input";
import { routeLifeRead } from "./life-read-route.server";
import { MemoryReadInput, MemoryWriteInput, WatashiProfileInput } from "./memory-input";
import { readMemory } from "./memory-read.server";
import { writeMemory } from "./memory-write.server";
import { decoded } from "./portal-decode";
import { watashiProfile } from "./profile-read.server";

type Operation = (input: unknown) => Effect.Effect<unknown, ToolFailure>;

const ownerWrite = writeMemory({ actor: PORTAL_ACTOR });

const lifeRead: Operation = (input) =>
  decoded(LifeReadInput)(input).pipe(Effect.flatMap(routeLifeRead));

const memoryRead: Operation = (input) =>
  decoded(MemoryReadInput)(input).pipe(Effect.flatMap(readMemory));

const memoryWrite: Operation = (input) =>
  decoded(MemoryWriteInput)(input).pipe(Effect.flatMap(ownerWrite));

const profile: Operation = (input) =>
  decoded(WatashiProfileInput)(input).pipe(Effect.flatMap(watashiProfile));

export { lifeRead, memoryRead, memoryWrite, profile };

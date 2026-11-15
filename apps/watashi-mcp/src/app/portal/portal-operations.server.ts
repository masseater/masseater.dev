import { PORTAL_ACTOR } from "@masseater.dev/portal-protocol";
import { Effect } from "effect";

import type { ToolFailure } from "#/shared/api";
import { LifeReadInput } from "#/entities/life-record";
import { MemoryReadInput, MemoryWriteInput, WatashiProfileInput } from "#/entities/memory";
import { routeLifeRead } from "#/features/life-tools/index.server";
import { readMemory, watashiProfile, writeMemory } from "#/features/memory-tools/index.server";

import { decoded } from "./portal-decode";

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

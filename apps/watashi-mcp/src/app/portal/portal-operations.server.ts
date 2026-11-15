import { PORTAL_ACTOR } from "@masseater.dev/portal-protocol";
import { Effect } from "effect";

import { LifeReadInput } from "#/entities/life-record";
import { MemoryReadInput, MemoryWriteInput, WatashiProfileInput } from "#/entities/memory";
import { routeLifeRead } from "#/features/life-tools/index.server";
import { readMemory, watashiProfile, writeMemory } from "#/features/memory-tools/index.server";
import type { ToolFailure } from "#/shared/api";

import { decoded } from "./portal-decode";

const ownerWrite = writeMemory({ actor: PORTAL_ACTOR });

const lifeRead: (input: unknown) => Effect.Effect<unknown, ToolFailure> = (input) =>
  decoded(LifeReadInput)(input).pipe(Effect.flatMap(routeLifeRead));

const memoryRead: (input: unknown) => Effect.Effect<unknown, ToolFailure> = (input) =>
  decoded(MemoryReadInput)(input).pipe(Effect.flatMap(readMemory));

const memoryWrite: (input: unknown) => Effect.Effect<unknown, ToolFailure> = (input) =>
  decoded(MemoryWriteInput)(input).pipe(Effect.flatMap(ownerWrite));

const profile: (input: unknown) => Effect.Effect<unknown, ToolFailure> = (input) =>
  decoded(WatashiProfileInput)(input).pipe(Effect.flatMap(watashiProfile));

export { lifeRead, memoryRead, memoryWrite, profile };

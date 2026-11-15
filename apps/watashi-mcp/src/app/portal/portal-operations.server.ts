import { PORTAL_ACTOR } from "@masseater.dev/portal-protocol";
import { Effect } from "effect";

import { LifeReadInput } from "#/entities/life-record/index.ts";
import { MemoryReadInput, MemoryWriteInput, WatashiProfileInput } from "#/entities/memory/index.ts";
import { routeLifeRead } from "#/features/life-tools/index.server.ts";
import { readMemory, watashiProfile, writeMemory } from "#/features/memory-tools/index.server.ts";
import type { ToolFailure } from "#/shared/api/index.ts";

import { decoded } from "./portal-decode";

const ownerWrite = writeMemory({ actor: PORTAL_ACTOR });

export const lifeRead: (input: unknown) => Effect.Effect<unknown, ToolFailure> = (input) =>
  decoded(LifeReadInput)(input).pipe(Effect.flatMap(routeLifeRead));

export const memoryRead: (input: unknown) => Effect.Effect<unknown, ToolFailure> = (input) =>
  decoded(MemoryReadInput)(input).pipe(Effect.flatMap(readMemory));

export const memoryWrite: (input: unknown) => Effect.Effect<unknown, ToolFailure> = (input) =>
  decoded(MemoryWriteInput)(input).pipe(Effect.flatMap(ownerWrite));

export const profile: (input: unknown) => Effect.Effect<unknown, ToolFailure> = (input) =>
  decoded(WatashiProfileInput)(input).pipe(Effect.flatMap(watashiProfile));

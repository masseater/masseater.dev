import { Effect, Match, Schema } from "effect";

import type { Memory } from "#/features/mcp/model/memory.table";
import { MemoryBody, TodoBody } from "#/features/mcp/model/record-body";
import type { Todo } from "#/features/mcp/model/todo.table";
import type { RestoreFailure } from "#/features/mcp/model/tool-failure";

import { findRevision } from "./history-store.server";
import type { RevisionRef } from "./history-store.server";
import { changeMemory } from "./memory-writer.server";
import type { Writer } from "./memory-writer.server";
import { changeTodo } from "./todo-writer.server";

const decodeMemory = Schema.decodeUnknownEffect(Schema.fromJsonString(MemoryBody));

const decodeTodo = Schema.decodeUnknownEffect(Schema.fromJsonString(TodoBody));

const restoreRecord =
  ({ actor }: Writer) =>
  (ref: RevisionRef): Effect.Effect<Memory | Todo, RestoreFailure> =>
    findRevision(ref).pipe(
      Effect.flatMap(({ entity, body }) =>
        Match.value(entity).pipe(
          Match.when("memory", () =>
            decodeMemory(body).pipe(
              Effect.orDie,
              Effect.flatMap(changeMemory({ actor, op: "restore" })),
            ),
          ),
          Match.when("todo", () =>
            decodeTodo(body).pipe(
              Effect.orDie,
              Effect.map((fields) => ({ id: ref.id, ...fields })),
              Effect.flatMap(changeTodo({ actor, op: "restore" })),
            ),
          ),
          Match.exhaustive,
        ),
      ),
    );

export { restoreRecord };

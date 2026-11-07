import { Schema } from "effect";

import { REVISION_ENTITIES } from "#/features/mcp/model/revision.table";

const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;
const MIN_HISTORY_LIMIT = 1;

const Entity = Schema.Literals(REVISION_ENTITIES).annotate({
  description: "memory は記憶、todo は ToDo",
});
const Id = Schema.Int.annotate({
  description: "memory_search・todo_list・todo_add などが返す id",
});
const LimitRange = Schema.isBetween({ minimum: MIN_HISTORY_LIMIT, maximum: MAX_HISTORY_LIMIT });

const HistoryInput = Schema.Struct({
  entity: Entity,
  id: Id,
  limit: Schema.optionalKey(
    Schema.Int.check(LimitRange).annotate({
      description: `返すリビジョンの数。既定は ${DEFAULT_HISTORY_LIMIT}`,
    }),
  ),
});

const RestoreInput = Schema.Struct({
  entity: Entity,
  id: Id,
  rev: Schema.Int.annotate({ description: "history が返す rev。この時点の中身に戻す" }),
});

export { DEFAULT_HISTORY_LIMIT, HistoryInput, RestoreInput };

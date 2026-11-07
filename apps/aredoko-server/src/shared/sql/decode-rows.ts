import { Effect, Schema } from "effect";

const decodeRows =
  <Row extends Schema.Constraint>(
    row: Row,
  ): (<Failure, Requirements>(
    statement: Effect.Effect<readonly unknown[], Failure, Requirements>,
  ) => Effect.Effect<
    readonly Row["Type"][],
    Failure | Schema.SchemaError,
    Requirements | Row["DecodingServices"]
  >) =>
  (statement) => {
    const decode = Schema.decodeUnknownEffect(Schema.Array(row));
    return statement.pipe(Effect.flatMap(decode));
  };

export { decodeRows };

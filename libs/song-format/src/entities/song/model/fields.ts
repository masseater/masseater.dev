import { Schema } from "effect";

const EARLIEST = 0;
export const Ticks = Schema.Int.check(Schema.isGreaterThanOrEqualTo(EARLIEST));
export const Share = Schema.Finite;
export const Name = Schema.String;
export const OptionalNumber = Schema.OptionFromNullOr(Schema.Finite);
export const OptionalShare = Schema.OptionFromNullOr(Share);

export const kind =
  <const Kind extends string>(name: Kind) =>
  <const Fields extends Schema.Struct.Fields>(
    fields: Fields,
  ): Schema.Struct<{ readonly kind: Schema.Literal<Kind> } & Fields> =>
    Schema.Struct({ kind: Schema.Literal(name), ...fields });

import { Option, Schema } from "effect";

const encodeJson = Schema.encodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

const toJson = (value: unknown): string => Option.getOrElse(encodeJson(value), () => String(value));

export { toJson };

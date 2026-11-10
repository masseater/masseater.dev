import { Option, Schema } from "effect";

const JsonText = Schema.fromJsonString(Schema.Unknown);

const encodeJson = Schema.encodeUnknownOption(JsonText);

const toJson = (value: unknown): string => Option.getOrElse(encodeJson(value), () => String(value));

const parseJson: (text: string) => Option.Option<unknown> = Schema.decodeOption(JsonText);

export { parseJson, toJson };

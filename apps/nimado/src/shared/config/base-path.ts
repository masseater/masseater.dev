import { String as Str, pipe } from "effect";

export const BASE_PATH = pipe(import.meta.env.BASE_URL, Str.replace(/\/$/u, ""));

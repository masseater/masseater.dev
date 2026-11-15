import { Schema } from "effect";

export const FigureNameSchema = Schema.Literals(["cascade-failure"]);

export type FigureName = typeof FigureNameSchema.Type;

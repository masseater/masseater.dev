import { Schema } from "effect";

const FigureNameSchema = Schema.Literals(["cascade-failure"]);

type FigureName = typeof FigureNameSchema.Type;

export type { FigureName };
export { FigureNameSchema };

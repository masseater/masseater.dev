import { Schema } from "effect";

const FigureNameSchema = Schema.Literals(["cascade-failure", "architecture"]);

type FigureName = typeof FigureNameSchema.Type;

export type { FigureName };
export { FigureNameSchema };

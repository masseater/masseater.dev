import { text } from "drizzle-orm/sqlite-core";

export const searchKeyColumns = {
  searchKey: text("search_key").notNull().default(""),
};

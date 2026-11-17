import { createInsertSchema } from "drizzle-zod";
import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const favoritesTable = pgTable(
  "groft_favorites",
  {
    userId: text("user_id").notNull(),
    traditionId: text("tradition_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.traditionId] })],
);

export const insertFavoriteSchema = createInsertSchema(favoritesTable).omit({
  createdAt: true,
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favoritesTable.$inferSelect;

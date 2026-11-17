import { getAuth } from "@clerk/express";
import { AddFavoritesBody, RemoveFavoriteParams } from "@workspace/api-zod";
import { db, favoritesTable } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { Router, type Request, type Response } from "express";

const router = Router();

function authenticatedUserId(req: Request, res: Response): string | null {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in to manage saved traditions." });
    return null;
  }
  return userId;
}

async function listForUser(userId: string) {
  const rows = await db
    .select({ traditionId: favoritesTable.traditionId })
    .from(favoritesTable)
    .where(eq(favoritesTable.userId, userId))
    .orderBy(asc(favoritesTable.traditionId));
  return { traditionIds: rows.map((row) => row.traditionId) };
}

router.get("/favorites", async (req, res, next) => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;
  try {
    res.json(await listForUser(userId));
  } catch (error) {
    next(error);
  }
});

router.post("/favorites", async (req, res, next) => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;
  try {
    const input = AddFavoritesBody.parse(req.body);
    const traditionIds = [...new Set(input.traditionIds)];
    if (traditionIds.length) {
      await db
        .insert(favoritesTable)
        .values(traditionIds.map((traditionId) => ({ userId, traditionId })))
        .onConflictDoNothing();
    }
    res.json(await listForUser(userId));
  } catch (error) {
    next(error);
  }
});

router.delete("/favorites/:traditionId", async (req, res, next) => {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;
  try {
    const { traditionId } = RemoveFavoriteParams.parse(req.params);
    await db
      .delete(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, userId),
          eq(favoritesTable.traditionId, traditionId),
        ),
      );
    res.json(await listForUser(userId));
  } catch (error) {
    next(error);
  }
});

export default router;

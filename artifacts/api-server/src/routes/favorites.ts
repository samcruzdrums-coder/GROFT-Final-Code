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
    const input = AddFavoritesBody.safeParse(req.body);
    if (!input.success) { res.status(400).json({ error: "Provide up to 5000 valid tradition IDs." }); return; }
    const traditionIds = [...new Set(input.data.traditionIds)];
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
    const params = RemoveFavoriteParams.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid tradition ID." }); return; }
    const { traditionId } = params.data;
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

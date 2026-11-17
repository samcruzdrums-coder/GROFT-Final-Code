import { Router, type IRouter } from "express";
import favoritesRouter from "./favorites";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(favoritesRouter);

export default router;

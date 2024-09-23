import { Router } from "express";
import { handleApiRequest, setFilePath } from "./controllers.js";

const router = Router();

router.post("/api", handleApiRequest);
router.post("/path", setFilePath);

export default router;

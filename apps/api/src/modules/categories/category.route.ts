import { Router } from "express";
import { getCategories, postCategory } from "./category.controller.js";

const router = Router();

router.get("/", getCategories);

router.post("/", postCategory);

export default router;

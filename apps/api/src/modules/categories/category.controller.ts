import type { RequestHandler } from "express";
import { categoryService } from "./category.service.js";

export const getCategories: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug({ userId }, "Fetching categories...");

  const categories = await categoryService.getCategories(userId);

  req.log.info({ userId }, "Categories fetched successfully");

  res.status(200).json({ data: categories.data });
};

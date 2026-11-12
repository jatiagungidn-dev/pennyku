import type { RequestHandler } from "express";
import { categoryService } from "./category.service.js";

export const getCategories: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug({ userId }, "Fetching categories...");

  const categories = await categoryService.getCategories(userId);

  req.log.info(
    { userId, count: categories.count },
    "Categories fetched successfully",
  );

  res.status(200).json({ data: categories.data, count: categories.count });
};

export const postCategory: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug({ userId }, "Creating category...");

  const category = await categoryService.postCategory(userId, req.body);

  req.log.info({ userId, data: category }, "Category created successfully");

  res.status(201).json({ data: category });
};

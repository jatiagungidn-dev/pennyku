import type { RequestHandler } from "express";
import { walletService } from "./wallet.service.js";
import { AppError } from "../../errors/AppError.js";
import { walletRepository } from "./wallet.repository.js";

export const getWallets: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug({ userId }, "Fetching wallets...");

  const wallets = await walletRepository.getWallets(userId);

  req.log.info({ userId }, "Wallets fetched successfully");

  res.status(200).json({ data: wallets.data, count: wallets.count });
};

export const createWallet: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;

  req.log.debug({ userId }, "Creating wallet...");

  const wallet = await walletService.create(userId, req.body);

  if (!wallet) {
    req.log.warn({ userId }, "Creating wallet failed: Invalid wallet data");
  }

  req.log.info({ userId }, "Wallet created successfully");

  res.status(201).json({ data: wallet });
};

export const updateWallet: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;
  const { id } = req.params;

  if (typeof id !== "string" || !id) {
    throw new AppError("Invalid Wallet ID", 400);
  }

  req.log.debug({ userId, walletId: id }, "Updating wallet...");

  const update = await walletService.update(id, userId, req.body);

  req.log.info({ userId, walletId: id }, "Wallet updated successfully");

  res.status(200).json({ data: update });
};

export const walletDelete: RequestHandler = async (req, res) => {
  const userId = req.auth!.userId;
  const { id } = req.params;

  req.log.debug({ userId, walletId: id }, "Deleting wallet...");

  if (!id || typeof id !== "string") {
    req.log.warn(
      { userId, walletId: id },
      "Deleting wallet failed: Invalid wallet ID",
    );

    throw new AppError("Invalid wallet ID", 400);
  }

  const wallet = await walletRepository.deleteWallet(id, userId);

  if (!wallet) {
    req.log.warn(
      { userId, walletId: id },
      "Deleting wallet failed: Wallet not found",
    );

    throw new AppError("Wallet not found", 404);
  }

  req.log.info({ userId, walletId: id }, "Wallet deleted successfully");

  res.status(200).json({ data: wallet.id });
};

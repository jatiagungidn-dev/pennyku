import z from "zod";

export const createWalletSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Wallet name is required")
    .max(100, "Wallet name can only contain 100 characters"),
  type: z.enum(["cash", "bank", "e-wallet", "other"]),
  initial_balance: z.preprocess(
    (value) => (typeof value === "string" && value === "" ? Number.NaN : value),
    z.coerce
      .number()
      .int("Initial balance must be a whole number")
      .nonnegative()
      .max(99_999_999_999_999),
  ),
});

export const updateWalletSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Wallet name is required")
      .max(100, "Wallet name can only contain 100 characters")
      .optional(),
    type: z.enum(["cash", "bank", "e-wallet", "other"]).optional(),
  })
  .refine((data) => data.name !== undefined || data.type !== undefined, {
    message: "At least one field is required for update",
  });

export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>;

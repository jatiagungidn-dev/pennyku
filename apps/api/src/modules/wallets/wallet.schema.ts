import z from "zod";

export const createWalletSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(["cash", "bank", "e-wallet", "other"]),
  initial_balance: z.coerce
    .number()
    .finite()
    .nonnegative()
    .max(99_999_999_999_999.99),
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;

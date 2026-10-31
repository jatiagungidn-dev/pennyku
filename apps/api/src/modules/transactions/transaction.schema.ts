import z from "zod";

export const createTransactionSchema = z.object({
  wallet_id: z.uuid(),
  category_id: z.uuid().optional().nullable(),
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().finite().positive().max(99_999_999_999_999.99),
  description: z.string().trim().max(255).optional(),
  transaction_date: z.iso.date().optional(),
});

export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

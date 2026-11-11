import z from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(["income", "expense"]),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#64748B"),
  icon: z.string().trim().min(1).default("tag"),
});

export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type CreateCategoryData = z.output<typeof createCategorySchema>;

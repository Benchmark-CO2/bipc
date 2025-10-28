import { z } from "zod";

export const disciplineFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  management: z.object({
    edit_project: z.boolean(),
    create_discipline: z.boolean(),
    create_unit: z.boolean(),
    generate_project_report: z.boolean(),
  }),
  simulations: z.object({
    create_unit: z.boolean(),
    generate_unit_report: z.boolean(),
  }),
  collaborators: z.array(z.string()),
});

export type DisciplineFormSchema = z.infer<typeof disciplineFormSchema>;

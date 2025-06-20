import { z } from 'zod'

export const addUnitFormSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres')
})

export type AddUnitFormSchema = z.infer<typeof addUnitFormSchema>

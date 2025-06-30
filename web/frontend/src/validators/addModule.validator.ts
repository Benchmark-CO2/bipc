import { z } from "zod";

export const addModuleFormSchema = z.object({
  nome: z
    .string()
    .min(3, "O nome deve ter pelo menos 3 caracteres")
    .max(50, "O nome deve ter no máximo 50 caracteres"),
  tipoDeEstrutura: z.enum(["beamColumn", "concreteWall", "masonry"], {
    required_error: "Selecione um tipo de estrutura",
    invalid_type_error: "Selecione um tipo de estrutura",
  }),
  numeroDeTorres: z.coerce
    .number()
    .min(1, "O número de torres deve ser maior que 0"),
  pavimentosSemFundacao: z.coerce
    .number()
    .min(1, "O número total de pavimentos deve ser maior que 0"),
  pavimentosTotalDaTorre: z.coerce
    .number()
    .min(1, "O número total de pavimentos da torre deve ser maior que 0"),
  pavimentosDoEmbasamento: z.coerce
    .number()
    .min(1, "O número de pavimentos do embasamento deve ser maior que 0"),
  numeroDeSubsolos: z.coerce
    .number()
    .min(1, "O número de subsolos deve ser maior que 0"),
  pavimentosTipo: z.coerce
    .number()
    .min(1, "O número de pavimentos tipo deve ser maior que 0"),
  areaConstruidaTotal: z.coerce
    .number()
    .min(1, "A área construída total deve ser maior que 0"),
  alturaPisoAPisoTipo: z.coerce
    .number()
    .min(0, "A altura do piso a piso do tipo deve ser maior que 0")
    .optional(),
  maiorPisoAPisoExistente: z.coerce
    .number()
    .min(0, "A maior altura do piso a piso existente deve ser maior que 0")
    .optional(),
  espessuraDeParedes: z.coerce
    .number()
    .min(0, "A espessura de paredes deve ser maior que 0")
    .optional(),
  espessuraDeLajes: z.coerce
    .number()
    .min(0, "A espessura de lajes deve ser maior que 0")
    .optional(),
  volumeDeConcretoFck20: z.coerce
    .number()
    .min(0, "O volume de concreto fck20 deve ser maior que 0"),
  volumeDeConcretoFck25: z.coerce
    .number()
    .min(0, "O volume de concreto fck25 deve ser maior que 0"),
  volumeDeConcretoFck30: z.coerce
    .number()
    .min(0, "O volume de concreto fck30 deve ser maior que 0"),
  volumeDeConcretoFck35: z.coerce
    .number()
    .min(0, "O volume de concreto fck35 deve ser maior que 0"),
  volumeDeConcretoFck40: z.coerce
    .number()
    .min(0, "O volume de concreto fck40 deve ser maior que 0"),
  volumeDeConcretoFck45: z.coerce
    .number()
    .min(0, "O volume de concreto fck45 deve ser maior que 0"),
  created_at: z.coerce.string().optional(),
});

export type AddModuleFormSchema = z.infer<typeof addModuleFormSchema>;

export const DEFAULT_VALUES: AddModuleFormSchema = {
  nome: "",
  numeroDeTorres: 1,
  pavimentosSemFundacao: 1,
  pavimentosTotalDaTorre: 1,
  pavimentosDoEmbasamento: 1,
  numeroDeSubsolos: 1,
  pavimentosTipo: 1,
  areaConstruidaTotal: 1,
  tipoDeEstrutura: "concreteWall",
  alturaPisoAPisoTipo: 0,
  maiorPisoAPisoExistente: 0,
  espessuraDeParedes: 0,
  espessuraDeLajes: 0,
  volumeDeConcretoFck20: 0,
  volumeDeConcretoFck25: 0,
  volumeDeConcretoFck30: 0,
  volumeDeConcretoFck35: 0,
  volumeDeConcretoFck40: 0,
  volumeDeConcretoFck45: 0,
};

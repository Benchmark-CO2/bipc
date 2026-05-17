import { z } from "zod";
import type { Translations } from "@/i18n/translations/pt-BR";

export function createAddModuleFormSchema(t: Translations) {
  return z.object({
    nome: z
      .string()
      .min(3, t.validators.nameMinLength)
      .max(50, t.validators.nameMaxLength),
    tipoDeEstrutura: z.enum(["beamColumn", "concreteWall", "masonry"], {
      required_error: t.validators.selectStructureType,
      invalid_type_error: t.validators.selectStructureType,
    }),
    numeroDeTorres: z.coerce.number().min(1, t.validators.towersMin),
    pavimentosSemFundacao: z.coerce
      .number()
      .min(1, t.validators.floorsWithoutFoundationMin),
    pavimentosTotalDaTorre: z.coerce
      .number()
      .min(1, t.validators.towerTotalFloorsMin),
    pavimentosDoEmbasamento: z.coerce
      .number()
      .min(1, t.validators.basementFloorsMin),
    numeroDeSubsolos: z.coerce
      .number()
      .min(1, t.validators.undergroundFloorsMin),
    pavimentosTipo: z.coerce.number().min(1, t.validators.typicalFloorsMin),
    areaConstruidaTotal: z.coerce
      .number()
      .min(1, t.validators.totalBuiltAreaMin),
    alturaPisoAPisoTipo: z.coerce
      .number()
      .min(0, t.validators.typicalFloorHeightMin)
      .optional(),
    maiorPisoAPisoExistente: z.coerce
      .number()
      .min(0, t.validators.maxFloorHeightMin)
      .optional(),
    espessuraDeParedes: z.coerce
      .number()
      .min(0, t.validators.wallThicknessMin)
      .optional(),
    espessuraDeLajes: z.coerce
      .number()
      .min(0, t.validators.slabThicknessMin)
      .optional(),
    volumeDeConcretoFck20: z.coerce.number().min(0, t.validators.concreteVolumeMin),
    volumeDeConcretoFck25: z.coerce.number().min(0, t.validators.concreteVolumeMin),
    volumeDeConcretoFck30: z.coerce.number().min(0, t.validators.concreteVolumeMin),
    volumeDeConcretoFck35: z.coerce.number().min(0, t.validators.concreteVolumeMin),
    volumeDeConcretoFck40: z.coerce.number().min(0, t.validators.concreteVolumeMin),
    volumeDeConcretoFck45: z.coerce.number().min(0, t.validators.concreteVolumeMin),
    created_at: z.coerce.string().optional(),
  });
}

export type AddModuleFormSchema = z.infer<ReturnType<typeof createAddModuleFormSchema>>;

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

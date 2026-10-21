import api from "@/service/api";
import { TUnknownModule } from "@/types/unknownModules";

export const getUserUnknownModules = () =>
  api.get<{ unknown_modules: TUnknownModule[] }>("/v1/users/unknown-modules");
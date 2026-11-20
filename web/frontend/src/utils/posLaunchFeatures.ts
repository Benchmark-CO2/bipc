import { ENV } from "@/utils/constants";

export const posLaunchFeatures = {
  filterChartMinMax: {
    enabled: true,
    description: "Ativa o filtro de valores mínimos e máximos no gráfico.",
  },
  trainingModal: {
    enabled: true,
    endDate: "2126-11-17T23:59:59",
    formUrl: "https://classroom.google.com/c/ODQyNjMyNjg3Mjkz?cjc=rxuxkvbl", // Substituir pelo link real do formulário
    youtubeUrl: "https://youtu.be/Xr2Auu6sf3Y",
    description: "Modal de capacitação para novos usuários da plataforma.",
  },
  xlsxImport: {
    // Desligado em produção até o IFC processor de produção aceitar
    // `file_type=xlsx` (hoje só no staging). Trocar para `true` no deploy.
    enabled: ENV !== "production",
    description:
      "Aba XLSX no drawer de importação (planilha processada pelo IFC processor).",
  },
  formExerciseRights: {
    enabled: true,
    formUrl: "https://forms.gle/ytcc9m3erCX5u4QZ9",
  },
};

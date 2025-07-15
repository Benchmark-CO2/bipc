import { IModuleItem } from "@/types/modules";
import { useMemo } from "react";

interface IModuleTotalsSummary {
  selectedModules: IModuleItem[];
}

export default function ModuleTotalsSummary({
  selectedModules,
}: IModuleTotalsSummary) {
  const grandTotals = useMemo(() => {
    // Soma das repetições para cálculo de média ponderada
    const totalRepetitions = selectedModules.reduce(
      (acc, module) => acc + (module.floor_repetition || 1),
      0
    );

    return {
      totalRepetitions,
      // Concreto/Aço: valor × repetição, depois soma
      total_concrete: selectedModules.reduce(
        (acc, module) =>
          acc + (module.total_concrete || 0) * (module.floor_repetition || 1),
        0
      ),
      total_steel: selectedModules.reduce(
        (acc, module) =>
          acc + (module.total_steel || 0) * (module.floor_repetition || 1),
        0
      ),

      // CO₂/Energia: média ponderada (valor × repetição, soma tudo, divide pela soma das repetições)
      co2_min:
        totalRepetitions > 0
          ? selectedModules.reduce(
              (acc, module) =>
                acc + (module.co2_min || 0) * (module.floor_repetition || 1),
              0
            ) / totalRepetitions
          : 0,
      co2_max:
        totalRepetitions > 0
          ? selectedModules.reduce(
              (acc, module) =>
                acc + (module.co2_max || 0) * (module.floor_repetition || 1),
              0
            ) / totalRepetitions
          : 0,
      energy_min:
        totalRepetitions > 0
          ? selectedModules.reduce(
              (acc, module) =>
                acc + (module.energy_min || 0) * (module.floor_repetition || 1),
              0
            ) / totalRepetitions
          : 0,
      energy_max:
        totalRepetitions > 0
          ? selectedModules.reduce(
              (acc, module) =>
                acc + (module.energy_max || 0) * (module.floor_repetition || 1),
              0
            ) / totalRepetitions
          : 0,
    };
  }, [selectedModules]);

  if (selectedModules.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Concreto
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {grandTotals.total_concrete.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">kg/m²</div>
        </div>

        <div className="bg-white dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Aço
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {grandTotals.total_steel.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">kg/m²</div>
        </div>

        <div className="bg-white dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            CO₂ Min (Média)
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {grandTotals.co2_min.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            kgCO₂/m²
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            CO₂ Max (Média)
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {grandTotals.co2_max.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            kgCO₂/m²
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Energia Min (Média)
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {grandTotals.energy_min.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">MJ/m²</div>
        </div>

        <div className="bg-white dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Energia Max (Média)
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {grandTotals.energy_max.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">MJ/m²</div>
        </div>
      </div>
      <div className="flex justify-end">
        <span className="text-xs text-gray-600 dark:text-gray-300">
          Módulos selecionados: {selectedModules.length}
        </span>
      </div>
    </>
  );
}

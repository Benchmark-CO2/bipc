import React from "react";
import { FloorSchema } from "@/validators/unitForm.validator";
import { TTowerFloorCategory } from "@/types/units";
import { Checkbox } from "@/components/ui/checkbox";

// Tipo unificado para representar um andar no visualizador
type UnifiedFloor = {
  id: string;
  name: string;
  area: number;
  height: number;
  category:
    | "penthouse_floor"
    | "standard_floor"
    | "ground_floor"
    | "basement_floor";
  repetition: number;
};

interface BuildingVisualizerProps {
  // Modo visualização apenas - usando FloorSchema
  floors?: FloorSchema[];

  // Modo selecionável - usando TTowerFloorCategory
  towerFloors?: TTowerFloorCategory[];
  isSelectable?: boolean;
  selectedFloorIds?: string[];
  onCheckFloorId?: (selectedFloorIds: string[]) => void;
}

const BuildingVisualizer: React.FC<BuildingVisualizerProps> = ({
  floors,
  towerFloors,
  isSelectable = false,
  selectedFloorIds = [],
  onCheckFloorId,
}) => {
  // Converter TTowerFloorCategory para UnifiedFloor
  const convertTowerFloors = (
    towerFloors: TTowerFloorCategory[]
  ): UnifiedFloor[] => {
    return towerFloors.map((floor) => ({
      id: floor.id,
      name: floor.group_name,
      area: floor.area,
      height: floor.height,
      repetition: 1, // TTowerFloorCategory não tem repetição
      category: getCategoryFromIndex(floor.index),
    }));
  };

  // Determinar categoria baseada no índice
  const getCategoryFromIndex = (index: number): UnifiedFloor["category"] => {
    if (index < 0) return "basement_floor";
    if (index === 0) return "ground_floor";
    if (index > 0 && index <= 10) return "standard_floor"; // Assumindo andares típicos até o 10º
    return "penthouse_floor"; // Andares superiores como cobertura
  };

  // Converter FloorSchema para UnifiedFloor
  const convertFloorSchema = (floors: FloorSchema[]): UnifiedFloor[] => {
    return floors.map((floor, index) => ({
      id: `floor-${index}`, // Gerar ID para FloorSchema
      name: floor.name,
      area: floor.area,
      height: floor.height,
      repetition: floor.repetition,
      category: floor.category,
    }));
  };

  // Determinar qual conjunto de dados usar
  const unifiedFloors: UnifiedFloor[] = towerFloors
    ? convertTowerFloors(towerFloors)
    : floors
      ? convertFloorSchema(floors)
      : [];

  // Se for selecionável, sempre usa towerFloors mode
  const selectedItems = isSelectable ? selectedFloorIds : [];
  const onSelectionChange = isSelectable ? onCheckFloorId : undefined;
  // Separar andares por categoria
  const roofFloors = unifiedFloors.filter(
    (floor) => floor.category === "penthouse_floor"
  );
  const typicalFloors = unifiedFloors.filter(
    (floor) => floor.category === "standard_floor"
  );
  const groundFloors = unifiedFloors.filter(
    (floor) => floor.category === "ground_floor"
  );
  const basementFloors = unifiedFloors.filter(
    (floor) => floor.category === "basement_floor"
  );

  const maxArea = Math.max(...unifiedFloors.map((floor) => floor.area), 1);

  // Ordenar cada categoria por posição (agora só pela ordem natural do array)
  const sortedRoofFloors = roofFloors;
  const sortedTypicalFloors = typicalFloors;
  const sortedGroundFloors = groundFloors;
  const sortedBasementFloors = basementFloors;

  const handleFloorSelection = (
    floorIdentifier: string,
    isChecked: boolean
  ) => {
    if (!onSelectionChange) return;

    let newSelectedItems: string[];

    if (isChecked) {
      // Adiciona o identificador se não estiver na lista
      newSelectedItems = selectedItems.includes(floorIdentifier)
        ? selectedItems
        : [...selectedItems, floorIdentifier];
    } else {
      // Remove o identificador da lista
      newSelectedItems = selectedItems.filter(
        (item: string) => item !== floorIdentifier
      );
    }

    onSelectionChange(newSelectedItems);
  };

  const renderFloorBlocks = (floor: UnifiedFloor) => {
    const blocks = [];
    const widthPercentage = (floor.area / maxArea) * 100;
    // Se for selecionável, sempre usar ID (towerFloors mode); senão usar name
    const floorIdentifier = isSelectable ? floor.id : floor.name;
    const isFloorSelected = selectedItems.includes(floorIdentifier);

    // Cores baseadas na categoria
    const categoryColors = {
      penthouse_floor: "#8B5CF6", // Roxo
      standard_floor: "#3B82F6", // Azul
      ground_floor: "#10B981", // Verde
      basement_floor: "#F59E0B", // Laranja
    };

    for (let i = 0; i < floor.repetition; i++) {
      blocks.push(
        <div
          key={`${floor.name}-${i}`}
          className={`h-6 mb-1 flex items-center text-xs font-medium text-white shadow-sm mx-auto ${
            isSelectable ? "justify-end pr-2" : "justify-center"
          }`}
          style={{
            backgroundColor: categoryColors[floor.category],
            height: `${Math.max(24, floor.height * 6)}px`,
            width: `${widthPercentage}%`,
            textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
          }}
          title={`${floor.name} - ${floor.area}m² - ${floor.height}m`}
        >
          <span className={isSelectable ? "mr-2" : ""}>{floor.name}</span>
          {isSelectable && (
            <Checkbox
              checked={isFloorSelected}
              onCheckedChange={(checked) =>
                handleFloorSelection(floorIdentifier, checked === true)
              }
              className=" border border-gray-300 bg-white data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
            />
          )}
        </div>
      );
    }
    return blocks;
  };

  return (
    <div className="flex flex-col items-center px-4 min-h-96 w-48">
      <h4 className="text-sm font-semibold mb-6 text-gray-700 dark:text-gray-300 h-[32px] content-center">
        Visualização da Torre
      </h4>

      <div className="flex flex-col items-center w-full max-w-40">
        {/* Estrutura de cima para baixo: Cobertura -> Tipo -> Térreo -> Subsolo */}
        <div className="flex flex-col w-full">
          {/* Cobertura (topo) */}
          {sortedRoofFloors.map((floor, index) => (
            <div key={`roof-${index}`} className="w-full max-w-35 mx-auto">
              {renderFloorBlocks(floor)}
            </div>
          ))}

          {/* Tipo */}
          {sortedTypicalFloors.map((floor, index) => (
            <div key={`typical-${index}`} className="w-full max-w-35 mx-auto">
              {renderFloorBlocks(floor)}
            </div>
          ))}

          {/* Térreo */}
          {sortedGroundFloors.map((floor, index) => (
            <div key={`ground-${index}`} className="w-full max-w-35 mx-auto">
              {renderFloorBlocks(floor)}
            </div>
          ))}
        </div>

        {/* Linha do solo - só aparece se houver andares acima e/ou subsolo */}
        {(roofFloors.length > 0 ||
          typicalFloors.length > 0 ||
          groundFloors.length > 0 ||
          basementFloors.length > 0) && (
          <div className="w-full h-0.5 bg-black my-3 relative">
            <div className="absolute -bottom-1 left-0 w-full h-2 bg-gray-400"></div>
          </div>
        )}

        {/* Subsolo (abaixo da linha do solo) */}
        <div className="flex flex-col w-full">
          {sortedBasementFloors.map((floor, index) => (
            <div key={`basement-${index}`} className="w-full max-w-35 mx-auto">
              {renderFloorBlocks(floor)}
            </div>
          ))}
        </div>

        {unifiedFloors.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-xs text-center">
            Adicione pavimentos
            <br />
            para visualizar a torre
          </div>
        )}
      </div>

      {unifiedFloors.length > 0 && (
        <div className="mt-6 p-2 bg-gray-100 dark:bg-gray-800 rounded-md w-full text-center">
          <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">
                {unifiedFloors.reduce(
                  (sum, floor) => sum + floor.repetition,
                  0
                )}
              </span>{" "}
              andares
            </div>
            <div>
              <span className="font-medium">
                {unifiedFloors
                  .reduce(
                    (sum, floor) => sum + floor.area * floor.repetition,
                    0
                  )
                  .toFixed(0)}
              </span>
              m² total
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildingVisualizer;

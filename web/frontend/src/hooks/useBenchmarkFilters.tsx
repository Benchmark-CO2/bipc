import { BuildIcon } from "@/components/buildIcons";
import { TechIcon } from "@/components/techIcons";
import Divider from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { regions, states } from "@/utils/states";
import { useState } from "react";

class FilterFloors {
  constructor(
    private from: number | undefined,
    private to: number | undefined
  ) {}
  get() {
    return { floors_from: this.from, floors_to: this.to };
  }
}
export const useBenchmarkFilters = () => {
  const [activeBuildFilter, setActiveBuildFilter] = useState<{
    floors_from: number | undefined;
    floors_to: number | undefined;
    technology: string[];
  }>({
    floors_from: undefined,
    floors_to: undefined,
    technology: [],
  });
  const changeFromTo = (from: number | undefined, to: number | undefined) => {
    setActiveBuildFilter({
      ...activeBuildFilter,
      floors_from: from,
      floors_to: to,
    });
  };
  const handleBuildFilterChange = (filterData: FilterFloors | string) => {
    if (filterData instanceof FilterFloors) {
      const { floors_from, floors_to } = filterData.get();
      if (
        activeBuildFilter.floors_from === floors_from &&
        activeBuildFilter.floors_to === floors_to
      ) {
        changeFromTo(undefined, undefined);
        return;
      }
      changeFromTo(floors_from, floors_to);
    } else {
      const technology = (
        activeBuildFilter.technology.includes(filterData as string)
          ? activeBuildFilter.technology.filter((tech) => tech !== filterData)
          : [...activeBuildFilter.technology, filterData]
      ) as string[];
      setActiveBuildFilter({
        ...activeBuildFilter,
        technology,
      });
    }
  };
  const FilterSection = (
    <section className="w-11/12 flex flex-col items-center gap-4 mb-4 max-sm:self-center">
      <h2 className="w-full text-left font-semibold text-primary">
        Filtros de visualização:
      </h2>
      <div className="min-xl:self-start max-sm:w-full max-sm:flex max-sm:justify-center max-sm:flex-col">
        <div className="flex gap-2 w-full">
          <Input
            placeholder="Número de projetos"
            className="mb-4 w-full"
            type="number"
          />
        </div>

        <Select>
          <SelectTrigger className="w-full self-start mb-4">
            <SelectValue placeholder="Região ou estado" />
          </SelectTrigger>
          <SelectContent
            defaultValue={"co2"}
            className=" max-sm:w-11/12  max-sm:self-center"
          >
            {regions.map((region) => (
              <SelectItem value={region.value}>{region.label}</SelectItem>
            ))}
            {states.map((state) => (
              <SelectItem value={state.value}>{state.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 max-sm:justify-center">
          <Input type={"date"} />
          <Input type={"date"} />
        </div>
        <Divider className="my-6" />
        <h3 className="mb-6 font-semibold text-primary ">
          Números de pavimentos:
        </h3>
        <div className="flex items-baseline gap-6 max-sm:max-w-full max-sm:mx-auto max-sm:overflow-x-auto">
          <BuildIcon
            name="house"
            isActive={
              activeBuildFilter.floors_to === 1 ||
              activeBuildFilter.floors_from === 1
            }
            onClick={() =>
              handleBuildFilterChange(new FilterFloors(undefined, 1))
            }
          />
          {/* <BuildIcon
            name="townHouse"
            isActive={activeBuildFilter.includes("twohouses")}
            onClick={() => handleBuildFilterChange("twohouses")}
          /> */}
          <BuildIcon
            name="twofloors"
            isActive={
              activeBuildFilter.floors_from === 2 ||
              activeBuildFilter.floors_to === 2
            }
            onClick={() =>
              handleBuildFilterChange(new FilterFloors(undefined, 2))
            }
          />
          <BuildIcon
            name="fourLess"
            isActive={
              activeBuildFilter.floors_from === 4 ||
              activeBuildFilter.floors_to === 4
            }
            onClick={() => handleBuildFilterChange(new FilterFloors(3, 4))}
          />
          <BuildIcon
            name="tenLess"
            isActive={activeBuildFilter.floors_to === 10}
            onClick={() => handleBuildFilterChange(new FilterFloors(5, 10))}
          />
          <BuildIcon
            name="tenMore"
            isActive={activeBuildFilter.floors_from === 10}
            onClick={() =>
              handleBuildFilterChange(new FilterFloors(10, undefined))
            }
          />
        </div>
        <Divider className="my-6" />
        <h3 className="mb-6 font-semibold text-primary">
          Técnologias Construtivas:
        </h3>
        <div className="flex items-baseline gap-6 max-sm:max-w-full max-sm:mx-auto max-sm:overflow-x-auto">
          <TechIcon
            name="beam_column"
            isActive={activeBuildFilter.technology.includes("beam_column")}
            onClick={() => handleBuildFilterChange("beam_column")}
          />
          <TechIcon
            name="structural_masonry"
            isActive={activeBuildFilter.technology.includes(
              "structural_masonry"
            )}
            onClick={() => handleBuildFilterChange("structural_masonry")}
          />
          <TechIcon
            name="concrete_wall"
            isActive={activeBuildFilter.technology.includes("concrete_wall")}
            onClick={() => handleBuildFilterChange("concrete_wall")}
          />
        </div>
      </div>
    </section>
  );

  return { FilterSection, activeBuildFilter };
};

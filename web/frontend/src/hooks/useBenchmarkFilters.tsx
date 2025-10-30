import { BuildIcon } from '@/components/buildIcons';
import { TechIcon } from '@/components/techIcons';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { regions, states } from '@/utils/states';
import { useState } from 'react';

export const useBenchmarkFilters = () => {
  const [activeBuildFilter, setActiveBuildFilter] = useState<{
    floors_from: number[];
    floors_to: number[];
    technology: string[];
  }>({
    floors_from: [],
    floors_to: [],
    technology: [],
  });
  const changeFromTo = (from: number[], to: number[]) => {
    setActiveBuildFilter({
      ...activeBuildFilter,
      floors_from: from,
      floors_to: to,
    });
  }
  const handleBuildFilterChange = (buildType: string | number) => {
    if (typeof buildType === "number") {
      if (activeBuildFilter.floors_from.includes(buildType) || activeBuildFilter.floors_to.includes(buildType)) {
        changeFromTo(
          activeBuildFilter.floors_from.filter((type) => type !== buildType),
          activeBuildFilter.floors_to.filter((type) => type !== buildType),
        );
      } else {
        if (buildType === 10) {
          changeFromTo(
            [...activeBuildFilter.floors_from, buildType],
            activeBuildFilter.floors_to,
          );
        } else {
          changeFromTo(
            activeBuildFilter.floors_from,
            [...activeBuildFilter.floors_to, buildType],
          );
        }
      }
      return;
    }
    if (typeof buildType === "string") {
      if (activeBuildFilter.technology.includes(buildType)) {
        setActiveBuildFilter({
          ...activeBuildFilter,
          technology: activeBuildFilter.technology.filter((type) => type !== buildType),
        });
      } else {
        setActiveBuildFilter({
          ...activeBuildFilter,
          technology: [...activeBuildFilter.technology, buildType],
        });
      }

    };
  };
  const FilterSection = (
    <section className="w-11/12 flex flex-col items-center gap-4 mb-4">
      <h2 className="w-full text-left font-semibold text-primary">
        Filtros de visualização:
      </h2>
      <div className="min-xl:self-start">
        <Input
          placeholder="Número de projetos"
          className="mb-4 w-full"
          type="number"
        />

        <Select>
          <SelectTrigger className="w-full self-start mb-4">
            <SelectValue placeholder="Região ou estado" />
          </SelectTrigger>
          <SelectContent defaultValue={"co2"}>
            {regions.map((region) => (
              <SelectItem value={region.value}>{region.label}</SelectItem>
            ))}
            {states.map((state) => (
              <SelectItem value={state.value}>{state.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input type={"date"} />
          <Input type={"date"} />
        </div>
        <h3 className="my-10 font-semibold text-primary">
          Tipos de edificação:
        </h3>
        <div className="flex items-baseline gap-6">
          <BuildIcon
            name="house"
            isActive={activeBuildFilter.floors_to.includes(1) || activeBuildFilter.floors_from.includes(1)}
            onClick={() => handleBuildFilterChange(1)}
          />
          {/* <BuildIcon
            name="townHouse"
            isActive={activeBuildFilter.includes("twohouses")}
            onClick={() => handleBuildFilterChange("twohouses")}
          /> */}
          <BuildIcon
            name="twofloors"
            isActive={activeBuildFilter.floors_from.includes(2) || activeBuildFilter.floors_to.includes(2)}
            onClick={() => handleBuildFilterChange(2)}
          />
          <BuildIcon
            name="fourLess"
            isActive={activeBuildFilter.floors_from.includes(4) || activeBuildFilter.floors_to.includes(4)}
            onClick={() => handleBuildFilterChange(4)}
          />
          <BuildIcon
            name="tenLess"
            isActive={activeBuildFilter.floors_to.includes(10)}
            onClick={() => handleBuildFilterChange(10)}
          />
          <BuildIcon
            name="tenMore"
            isActive={activeBuildFilter.floors_from.includes(10)}
            onClick={() => handleBuildFilterChange(10)}
          />
        </div>
        <h3 className="my-10 font-semibold text-primary">
          Tipos de edificação:
        </h3>
        <div className="flex items-baseline gap-6">
          <TechIcon
            name="frame"
            isActive={activeBuildFilter.technology.includes("frame")}
            onClick={() => handleBuildFilterChange("frame")}
          />
          <TechIcon
            name="structural"
            isActive={activeBuildFilter.technology.includes("structural")}
            onClick={() => handleBuildFilterChange("structural")}
          />
          <TechIcon
            name="concrete"
            isActive={activeBuildFilter.technology.includes("concrete")}
            onClick={() => handleBuildFilterChange("concrete")}
          />
        </div>
      </div>
    </section>
  );

  return { FilterSection, activeBuildFilter };
};

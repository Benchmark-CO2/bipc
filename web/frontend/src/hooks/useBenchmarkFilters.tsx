import { BuildIcon } from "@/components/buildIcons";
import { TechIcon } from "@/components/techIcons";
import Divider from "@/components/ui/divider";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { useState } from "react";
import { useTranslation } from "@/i18n";

class FilterFloors {


  constructor(private filterList: string[] = []) { }

  stringfyFilter(from: string, to?: string) {
    if (!from) return "";
    if (to == null) return `${from}`;
    return `${from}-${to}`;
  }

  insertFilter(option: string) {
    if (this.filterList.includes(option)) {
      return new FilterFloors(this.filterList.filter(el => el !== option))
    } else {
      return new FilterFloors([...this.filterList, option])
    }
  }

  get() {
    return this.filterList.join(',')
  }

  has(option: string) {
    return this.filterList.includes(option)
  }

  toJSON() {
    return this.get()
  }
}
export const useBenchmarkFilters = () => {
  const [activeBuildFilter, setActiveBuildFilter] = useState<{
    floors: FilterFloors
    technology: string[];
  }>({
    floors: new FilterFloors(),
    technology: [],
  });
  const [type, setType] = useState<"co2" | "energy">("co2");
  const { t } = useTranslation();

  const handleFloorsFilterChange = (filter: string) => {
    setActiveBuildFilter(oldState => ({
      ...oldState,
      floors: oldState.floors.insertFilter(filter)
    }))
  }

  const handleBuildFilterChange = (filterData: FilterFloors | string) => {
    const technology = (
      activeBuildFilter.technology.includes(filterData as string)
        ? activeBuildFilter.technology.filter((tech) => tech !== filterData)
        : [...activeBuildFilter.technology, filterData]
    ) as string[];
    setActiveBuildFilter({
      ...activeBuildFilter,
      technology,
    });
  };

  const FilterSection = (
    <section className="w-full md:w-1/3 min-w-[375px] flex flex-col items-center gap-4 mb-4 max-sm:self-center max-lg:w-full!">
      <h2 className="w-full text-left font-semibold text-primary">
        {t.benchmark.filters.title}
      </h2>
      <div className="min-xl:self-start max-sm:w-full max-sm:flex max-sm:justify-center max-sm:flex-col pl-2">
        <h3 className="mb-2 font-semibold text-primary text-sm">
          {t.benchmark.filters.indicators}
        </h3>
        <FilterTabs
          tabs={["co2", "energy"]}
          onTabSelect={(tab) => setType(tab as "co2" | "energy")}
          selectedTab={type}
          className="w-full max-w-[500px]"
          tabsStyle="w-full"
        />
        <Divider className="my-6" />
        <h3 className="mb-6 font-semibold text-primary text-sm">
          {t.benchmark.filters.floors}
        </h3>
        <div className="flex items-baseline gap-6 max-sm:max-w-full max-sm:mx-auto overflow-x-auto">
          <BuildIcon
            name="house"
            isActive={activeBuildFilter.floors.has('1')}
            onClick={() =>
              handleFloorsFilterChange('1')
            }
          />
          {/* <BuildIcon
            name="townHouse"
            isActive={activeBuildFilter.includes("twohouses")}
            onClick={() => handleBuildFilterChange("twohouses")}
          /> */}
          <BuildIcon
            name="twofloors"
            isActive={activeBuildFilter.floors.has('2')}
            onClick={() =>
              handleFloorsFilterChange('2')
            }
          />
          <BuildIcon
            name="fourLess"
            isActive={activeBuildFilter.floors.has('3-4')}
            onClick={() => handleFloorsFilterChange('3-4')}
          />
          <BuildIcon
            name="tenLess"
            isActive={activeBuildFilter.floors.has('5-10')}
            onClick={() => handleFloorsFilterChange('5-10')}
          />
          <BuildIcon
            name="tenMore"
            isActive={activeBuildFilter.floors.has('11+')}
            onClick={() =>
              handleFloorsFilterChange('11+')
            }
          />
        </div>
        <Divider className="my-6" />
        <h3 className="mb-6 font-semibold text-primary text-sm">
          {t.benchmark.filters.technology}
        </h3>
        <div className="flex items-baseline gap-6 max-sm:max-w-full max-sm:mx-auto overflow-x-auto">
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

  return { FilterSection, activeBuildFilter, type };
};

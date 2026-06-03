import { BuildIcon } from "@/components/buildIcons";
import { TechIcon } from "@/components/techIcons";
import Divider from "@/components/ui/divider";
import { useTranslation } from "@/i18n";
import { useState } from "react";

class FilterFloors {
  constructor(private filterList: string[] = []) {}

  stringfyFilter(from: string, to?: string) {
    if (!from) return "";
    if (to == null) return `${from}`;
    return `${from}-${to}`;
  }

  insertFilter(option: string) {
    if (this.filterList.includes(option)) {
      return new FilterFloors(this.filterList.filter((el) => el !== option));
    } else {
      return new FilterFloors([...this.filterList, option]);
    }
  }

  get() {
    return this.filterList.join(",");
  }

  has(option: string) {
    return this.filterList.includes(option);
  }

  toJSON() {
    return this.get();
  }
}
export const useBenchmarkFilters = () => {
  const [activeBuildFilter, setActiveBuildFilter] = useState<{
    floors: FilterFloors;
    technology: string[];
  }>({
    floors: new FilterFloors(),
    technology: [],
  });
  const [type, setType] = useState<"co2" | "energy" | "material">("co2");
  const { t } = useTranslation();

  const handleFloorsFilterChange = (filter: string) => {
    setActiveBuildFilter((oldState) => ({
      ...oldState,
      floors: oldState.floors.insertFilter(filter),
    }));
  };

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
    <section className="w-full min-w-0 flex flex-col items-center gap-4 mb-4">
      <h2 className="w-full text-left font-semibold text-primary">
        {t.benchmark.filters.title}
      </h2>
      <div className="w-full min-xl:self-start max-sm:flex max-sm:justify-center max-sm:flex-col pl-2">
        <h3 className="mb-6 font-semibold text-primary text-sm">
          {t.benchmark.filters.floors}
        </h3>
        <div className="flex items-end gap-3 sm:gap-4 lg:gap-6 xl:grid xl:grid-cols-5 xl:grid-rows-[1fr_auto] xl:gap-x-[clamp(8px,1.2vw,22px)] xl:gap-y-2 xl:[&_svg]:row-start-1 xl:[&_svg]:self-end xl:[&_svg]:justify-self-center xl:[&_span]:row-start-2 xl:[&_span]:text-center">
          <BuildIcon
            name="house"
            isActive={activeBuildFilter.floors.has("1")}
            onClick={() => handleFloorsFilterChange("1")}
            className="[&_svg]:h-auto xl:contents xl:[&_svg]:w-[clamp(28px,3.5vw,55px)]"
          />
          {/* <BuildIcon
            name="townHouse"
            isActive={activeBuildFilter.includes("twohouses")}
            onClick={() => handleBuildFilterChange("twohouses")}
          /> */}
          <BuildIcon
            name="twofloors"
            isActive={activeBuildFilter.floors.has("2")}
            onClick={() => handleFloorsFilterChange("2")}
            className="[&_svg]:h-auto xl:contents xl:[&_svg]:w-[clamp(28px,3.5vw,55px)]"
          />
          <BuildIcon
            name="fourLess"
            isActive={activeBuildFilter.floors.has("3-4")}
            onClick={() => handleFloorsFilterChange("3-4")}
            className="[&_svg]:h-auto xl:contents xl:[&_svg]:w-[clamp(28px,3.5vw,55px)]"
          />
          <BuildIcon
            name="tenLess"
            isActive={activeBuildFilter.floors.has("5-10")}
            onClick={() => handleFloorsFilterChange("5-10")}
            className="[&_svg]:h-auto xl:contents xl:[&_svg]:w-[clamp(28px,3.5vw,55px)]"
          />
          <BuildIcon
            name="tenMore"
            isActive={activeBuildFilter.floors.has("11+")}
            onClick={() => handleFloorsFilterChange("11+")}
            className="[&_svg]:h-auto xl:contents xl:[&_svg]:w-[clamp(28px,3.5vw,55px)]"
          />
        </div>
        <Divider className="my-6" />
        <h3 className="mb-6 font-semibold text-primary text-sm">
          {t.benchmark.filters.technology}
        </h3>
        <div className="flex items-end gap-3 sm:gap-4 lg:gap-6 xl:grid xl:grid-cols-3 xl:grid-rows-[1fr_auto] xl:gap-x-[clamp(12px,2.5vw,40px)] xl:gap-y-2 xl:[&_svg]:row-start-1 xl:[&_svg]:self-end xl:[&_svg]:justify-self-center xl:[&_span]:row-start-2 xl:[&_span]:text-center">
          <TechIcon
            name="beam_column"
            isActive={activeBuildFilter.technology.includes("beam_column")}
            onClick={() => handleBuildFilterChange("beam_column")}
            className="[&_svg]:h-auto xl:contents xl:[&_svg]:w-[clamp(55px,6.5vw,107px)]"
          />
          <TechIcon
            name="structural_masonry"
            isActive={activeBuildFilter.technology.includes(
              "structural_masonry",
            )}
            onClick={() => handleBuildFilterChange("structural_masonry")}
            className="[&_svg]:h-auto xl:contents xl:[&_svg]:w-[clamp(55px,6.5vw,107px)]"
          />
          <TechIcon
            name="concrete_wall"
            isActive={activeBuildFilter.technology.includes("concrete_wall")}
            onClick={() => handleBuildFilterChange("concrete_wall")}
            className="[&_svg]:h-auto xl:contents xl:[&_svg]:w-[clamp(55px,6.5vw,107px)]"
          />
        </div>
      </div>
    </section>
  );

  return { FilterSection, activeBuildFilter, type, setType };
};

import { IBenchmarkResponse } from "@/actions/benchmarks/types";
import { IProject } from "@/types/projects";

export const stackData = <T extends IProject>(item: T[], data: IBenchmarkResponse) => {
  return (item || [])
    .map(({ id }) => {
      const project = item.find((p) => p.id === id);
      if (!project) return null;

      const co2Item = data.benchmark.co2.find((b) => b.id === id);
      const energyItem = data.benchmark.energy.find((b) => b.id === id);

      const co2 = co2Item ? (co2Item.min + co2Item.max) / 2 : 0;
      const energy = energyItem ? (energyItem.min + energyItem.max) / 2 : 0;

      return {
        id,
        label: project.name || project.group_name || '',
        co2,
        energy,
      };
    })
    .filter(Boolean);
};

export const barColors = [
  "#FFE8A3",
  "#F4AFEE",
  "#B2F4AF",
  "bg-blue-500",
  "bg-purple-500",
  "bg-red-500",
];

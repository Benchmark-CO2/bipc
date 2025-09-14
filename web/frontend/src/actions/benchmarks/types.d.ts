export type IBenchmarkItem = {
  id: string;
  y: number;
  min: number;
  max: number;
};
export type IBenchmarkResponse = {
  benchmark: {
    co2: IBenchmarkItem[];
    energy: IBenchmarkItem[];
  };
};

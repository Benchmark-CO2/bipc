export type IBenchmarkItem = {
  id: string;
  y: number;
  min: number;
  max: number;
};

export type IBenchmarkSeriesPoint = {
  id: string;
  y: number;
  value: number;
  floors?: string | number;
  technology?: string[];
};

export type IBenchmarkSeries = {
  min: IBenchmarkSeriesPoint[];
  max: IBenchmarkSeriesPoint[];
};

export type IBenchmarkResponse = {
  benchmark: {
    co2: IBenchmarkSeries;
    energy: IBenchmarkSeries;
  };
};

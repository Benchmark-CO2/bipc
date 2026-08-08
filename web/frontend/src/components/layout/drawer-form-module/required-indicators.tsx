export const RequiredAsterisk = () => (
  <span className="text-red-500 font-semibold ml-0.5" aria-hidden="true">
    *
  </span>
);

interface RequiredLegendProps {
  legend: string;
}

export const RequiredLegend = ({ legend }: RequiredLegendProps) => (
  <p className="text-xs text-muted-foreground mb-1 pb-1 border-b border-gray-100">
    <span className="text-red-500 font-semibold mr-1 align-middle">*</span>
    {legend}
  </p>
);

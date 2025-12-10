export const formatNumber = (number: number, decimals: number = 2): string => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

export const parseNumber = (value: string | number): number => {
  if (typeof value === "number") return value;
  if (!value || value.trim() === "") return NaN;
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return parsed;
};

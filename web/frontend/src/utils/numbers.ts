export const formatNumber = (number: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

export const parseNumber = (value: string): number => {
  if (!value) return 0;
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}
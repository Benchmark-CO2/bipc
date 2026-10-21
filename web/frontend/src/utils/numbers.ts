export const formatNumber = (
  number: number,
  decimals: number = 2,
): string => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

export const parseNumber = (value: string | number): number => {
  if (typeof value === "number") return value;
  if (!value || value.trim() === "") return NaN;
  const normalized = normalizeNumericString(value, Infinity).replace(",", ".");
  if (!normalized || normalized === "-" || normalized === ".") return NaN;
  const parsed = parseFloat(normalized);
  return parsed;
};

export const isNumericCharValid = (ch: string): boolean => {
  if (ch === "-" || ch === "," || ch === ".") return true;
  const code = ch.charCodeAt(0);
  return code >= 48 && code <= 57;
};

export const normalizeNumericString = (
  raw: string | null | undefined,
  maxDecimalPlaces: number = 2,
  allowNegative: boolean = true,
): string => {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).trim();
  if (s === "") return "";
  const hasNeg = s.startsWith("-") && allowNegative;
  if (hasNeg) s = s.slice(1);
  s = s.replace(/[^0-9,.]/g, "");
  let commaIdx = s.indexOf(",");
  const dotIdx = s.indexOf(".");
  if (commaIdx === -1 && dotIdx !== -1) {
    const afterDot = s.slice(dotIdx + 1);
    const looksLikeThousandsDot =
      dotIdx > 0 && (afterDot.length === 3 || s.indexOf(".", dotIdx + 1) !== -1);
    if (looksLikeThousandsDot) {
      s = s.replace(/\./g, "");
    } else {
      s = `${s.slice(0, dotIdx)},${afterDot}`;
      commaIdx = dotIdx;
    }
  } else if (commaIdx !== -1 && dotIdx !== -1) {
    if (commaIdx < dotIdx) {
      s =
        s.slice(0, commaIdx).replace(/\./g, "") +
        "," +
        s.slice(commaIdx + 1).replace(/\./g, "");
    } else {
      s =
        s.slice(0, dotIdx).replace(/,/g, "") +
        "," +
        s.slice(dotIdx + 1).replace(/,/g, "");
    }
  } else {
    s = s.replace(/\./g, "");
    commaIdx = s.indexOf(",");
  }
  let intPart = s;
  let decPart = "";
  if (commaIdx !== -1) {
    intPart = s.slice(0, commaIdx);
    decPart = s.slice(commaIdx + 1);
  }
  intPart = intPart.replace(/[^0-9]/g, "");
  decPart = decPart.replace(/[^0-9]/g, "");
  if (Number.isFinite(maxDecimalPlaces) && maxDecimalPlaces >= 0) {
    decPart = decPart.slice(0, maxDecimalPlaces);
  }
  if (intPart.length > 1) {
    intPart = intPart.replace(/^0+(\d)/, "$1");
  }
  let result = intPart;
  if (commaIdx !== -1) {
    result += `,${decPart}`;
  }
  if (hasNeg && result !== "") result = `-${result}`;
  return result;
};

export const formatNumericString = (
  raw: string | number | null | undefined,
  maxDecimalPlaces: number = 2,
  allowNegative: boolean = true,
  forceDecimalPlaces: boolean = false,
): string => {
  if (raw === null || raw === undefined) return "";
  const normalized = normalizeNumericString(
    typeof raw === "number" ? String(raw).replace(".", ",") : String(raw),
    maxDecimalPlaces,
    allowNegative,
  );
  if (normalized === "" || normalized === "-") return normalized;
  const num = parseNumber(normalized);
  if (!Number.isFinite(num)) return normalized;
  const decimals = forceDecimalPlaces ? Math.max(0, maxDecimalPlaces) : (() => {
    const commaIdx = normalized.indexOf(",");
    if (commaIdx === -1) return 0;
    return normalized.slice(commaIdx + 1).length;
  })();
  return formatNumber(num, decimals);
};

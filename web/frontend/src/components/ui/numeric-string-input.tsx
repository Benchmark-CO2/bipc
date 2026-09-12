import { cn } from "@/lib/utils";
import { forwardRef, useEffect, useState } from "react";
import { formatNumericString, normalizeNumericString } from "@/utils/numbers";
import { Input } from "./input";

export type NumericStringInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "type" | "onChange"
> & {
  value?: string | number | null;
  onChange?: (value: string) => void;
  decimalPlaces?: number;
  allowNegative?: boolean;
  alignRight?: boolean;
  forceDecimalPlaces?: boolean;
};

const NumericStringInput = forwardRef<
  HTMLInputElement,
  NumericStringInputProps
>(
  (
    {
      value,
      onChange,
      decimalPlaces = 2,
      allowNegative = true,
      alignRight = false,
      forceDecimalPlaces = false,
      className,
      onBlur,
      onFocus,
      autoComplete = "off",
      spellCheck = false,
      inputMode = "decimal",
      ...rest
    },
    ref,
  ) => {
    const [display, setDisplay] = useState<string>(() => {
      const initial: string | null | undefined = (() => {
        if (typeof value === "number" && Number.isFinite(value)) {
          return String(value).replace(".", ",");
        }
        if (value === null || value === undefined) return "";
        return String(value);
      })();
      return normalizeNumericString(initial, decimalPlaces, allowNegative);
    });
    const [focused, setFocused] = useState<boolean>(false);

    useEffect(() => {
      const rawInput: string | null | undefined = (() => {
        if (typeof value === "number" && Number.isFinite(value)) {
          return String(value).replace(".", ",");
        }
        if (value === null || value === undefined) return "";
        return String(value);
      })();
      const normalized = normalizeNumericString(
        rawInput,
        decimalPlaces,
        allowNegative,
      );
      const displayed = focused
        ? normalized
        : formatNumericString(
            normalized,
            decimalPlaces,
            allowNegative,
            forceDecimalPlaces,
          );
      setDisplay((cur) => (cur === displayed ? cur : displayed));
    }, [value, decimalPlaces, allowNegative, focused, forceDecimalPlaces]);

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        className={cn(alignRight ? "text-right tabular-nums" : "", className)}
        value={display}
        {...rest}
        onChange={(e) => {
          const next = normalizeNumericString(
            e.target.value,
            decimalPlaces,
            allowNegative,
          );
          setDisplay(next);
          onChange?.(next);
        }}
        onFocus={(e) => {
          setFocused(true);
          const raw = normalizeNumericString(
            display,
            decimalPlaces,
            allowNegative,
          );
          setDisplay(raw);
          onFocus?.(e);
          requestAnimationFrame(() => {
            try {
              (e.target as HTMLInputElement).select();
            } catch {
              /* no-op */
            }
          });
        }}
        onBlur={(e) => {
          setFocused(false);
          const formatted = formatNumericString(
            display,
            decimalPlaces,
            allowNegative,
            forceDecimalPlaces,
          );
          const normalized = normalizeNumericString(
            formatted,
            decimalPlaces,
            allowNegative,
          );
          setDisplay(formatted);
          if (
            normalized !==
            normalizeNumericString(display, decimalPlaces, allowNegative)
          ) {
            onChange?.(normalized);
          }
          onBlur?.(e);
        }}
      />
    );
  },
);

NumericStringInput.displayName = "NumericStringInput";

export { NumericStringInput };

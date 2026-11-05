import { cn } from "@/lib/utils";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { formatNumericString, normalizeNumericString } from "@/utils/numbers";
import { selectAllOnDoubleClick } from "@/utils/inputSelection";
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
      onDoubleClick,
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
    const inputRef = useRef<HTMLInputElement | null>(null);
    // Seleção a restaurar depois de trocar o texto formatado pelo editável.
    const pendingSelectionRef = useRef<[number, number] | null>(null);
    // Troca adiada do onFocus; cancelada se o usuário editar ou sair antes.
    const focusSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    const cancelFocusSwitch = () => {
      if (focusSwitchTimerRef.current === null) return;
      clearTimeout(focusSwitchTimerRef.current);
      focusSwitchTimerRef.current = null;
    };

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    useLayoutEffect(() => {
      const selection = pendingSelectionRef.current;
      const el = inputRef.current;
      if (!selection || !el) return;
      pendingSelectionRef.current = null;
      el.setSelectionRange(selection[0], selection[1]);
    }, [display]);

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
        ref={setRefs}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        className={cn(alignRight ? "text-right tabular-nums" : "", className)}
        value={display}
        {...rest}
        onChange={(e) => {
          // Editou antes da troca adiada do onFocus: segue com o que digitou.
          cancelFocusSwitch();
          if (!focused) setFocused(true);
          const next = normalizeNumericString(
            e.target.value,
            decimalPlaces,
            allowNegative,
          );
          setDisplay(next);
          onChange?.(next);
        }}
        onFocus={(e) => {
          onFocus?.(e);
          const el = e.currentTarget;
          const formatted = display;
          const raw = normalizeNumericString(
            formatted,
            decimalPlaces,
            allowNegative,
          );
          if (raw === formatted) {
            setFocused(true);
            return;
          }
          // Ao focar, o texto formatado ("1.234,56") vira o editável
          // ("1234,56"). Espera o navegador posicionar o cursor do clique (ou
          // selecionar tudo, no Tab) e mantém essa posição descontando os
          // pontos de milhar; trocar o texto antes jogaria o cursor para o fim.
          cancelFocusSwitch();
          focusSwitchTimerRef.current = setTimeout(() => {
            focusSwitchTimerRef.current = null;
            if (document.activeElement !== el || el.value !== formatted) return;
            const toRawIndex = (pos: number) =>
              pos - (formatted.slice(0, pos).match(/\./g)?.length ?? 0);
            const start = el.selectionStart ?? formatted.length;
            const end = el.selectionEnd ?? start;
            pendingSelectionRef.current = [toRawIndex(start), toRawIndex(end)];
            setFocused(true);
            setDisplay(raw);
          }, 0);
        }}
        onDoubleClick={(e) => {
          selectAllOnDoubleClick(e);
          onDoubleClick?.(e);
        }}
        onBlur={(e) => {
          cancelFocusSwitch();
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

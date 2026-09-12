import { Check, ChevronsUpDown, Plus } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface FreeformComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyCustomLabel?: string;
  emptyOptionsLabel?: string;
  disabled?: boolean;
  className?: string;
  endAdornment?: React.ReactNode;
}

export function FreeformCombobox({
  value,
  onChange,
  options,
  placeholder,
  emptyCustomLabel,
  emptyOptionsLabel,
  disabled,
  className,
  endAdornment,
}: FreeformComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");

  const customValue = searchInput.trim();
  const hasCustomValue = customValue.length > 0;
  const customValueAlreadyInOptions = hasCustomValue
    ? options.some((o) => o.value === customValue || o.label === customValue)
    : false;

  const displayLabel = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          <span
            className={cn("truncate", !displayLabel && "text-muted-foreground")}
          >
            {displayLabel || placeholder}
          </span>
          <div className="ml-2 flex items-center gap-1.5 shrink-0">
            {endAdornment}
            <ChevronsUpDown
              className={cn(
                "h-4 w-4 opacity-50",
                endAdornment ? "" : "opacity-50",
              )}
            />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder={placeholder}
            className="h-9"
            value={searchInput}
            onValueChange={setSearchInput}
          />
          <CommandList>
            {!hasCustomValue && options.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                {emptyOptionsLabel}
              </div>
            ) : null}

            {hasCustomValue && !customValueAlreadyInOptions && (
              <div className="px-2 pt-2 pb-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    onChange(customValue);
                    setSearchInput("");
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  <span className="truncate">
                    {emptyCustomLabel
                      ? `${emptyCustomLabel}: "${customValue}"`
                      : `"${customValue}"`}
                  </span>
                </Button>
              </div>
            )}

            {options.length > 0 && (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onChange(opt.value === value ? "" : opt.value);
                      setSearchInput("");
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{opt.label}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4 shrink-0",
                        value === opt.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {options.length === 0 &&
              hasCustomValue &&
              customValueAlreadyInOptions && (
                <CommandEmpty>{emptyOptionsLabel}</CommandEmpty>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

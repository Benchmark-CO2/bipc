import { Check, ChevronsUpDown } from "lucide-react";
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
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { type CityOption } from "@/hooks/useCities";
import { useTranslation } from "react-i18next";

interface CityComboboxProps {
  cities: CityOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function CityCombobox({
  cities,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  isError = false,
  placeholder,
  searchPlaceholder,
  emptyMessage,
}: CityComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation();

  const displayPlaceholder =
    placeholder ?? t("drawerFormProject.cityPlaceholder");
  const displaySearchPlaceholder =
    searchPlaceholder ?? t("drawerFormProject.citySearchPlaceholder");
  const displayEmpty = emptyMessage ?? t("drawerFormProject.cityNotFound");

  // Fallback to manual input when the cities API fails or returns empty (after loading)
  if (isError || (!isLoading && cities.length === 0 && !disabled)) {
    return (
      <Input
        placeholder={displayPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || displayPlaceholder}
          </span>
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-1 border-primary border-t-transparent ml-2 shrink-0" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={displaySearchPlaceholder}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>{displayEmpty}</CommandEmpty>
            <CommandGroup>
              {cities.map((city) => (
                <CommandItem
                  key={city.value}
                  value={city.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  {city.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === city.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

import { cn } from "cn";
import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full bg-primary/15 data-[orientation=horizontal]:h-0.75 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-0.75"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute bg-primary/40 data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>
      
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          // Área clicável de 16x16 (transparente); o visual é um círculo de 8px desenhado pelo ::before.
          // Discreto (branco com borda teal) e cheio em hover, arraste (active) e foco.
          className="relative block size-4 shrink-0 rounded-full bg-transparent cursor-grab active:cursor-grabbing focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 before:absolute before:inset-1 before:rounded-full before:border before:border-primary before:bg-white before:transition-colors hover:before:bg-primary active:before:bg-primary focus-visible:before:bg-primary focus-visible:before:ring-2 focus-visible:before:ring-primary/30"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider };

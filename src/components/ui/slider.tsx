"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  rangeClassName,
  thumbLabel,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { rangeClassName?: string; thumbLabel?: string }) {
  const values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min]),
    [value, defaultValue, min],
  );
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/25"
      >
        <SliderPrimitive.Range data-slot="slider-range" className={cn("absolute h-full bg-primary", rangeClassName)} />
      </SliderPrimitive.Track>
      {values.map((_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={thumbLabel}
          className="block size-4 shrink-0 cursor-pointer rounded-full border-2 border-white bg-primary shadow-sm transition-[transform,box-shadow] hover:scale-110 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-hidden"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };

import { Card, CardContent } from "@/components/ui/card";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import * as d3 from "d3";
import { regressionPoly } from "d3-regression";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Divider from "../ui/divider";

// Utility: Debounce function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const UNIT_LABELS = {
  "KgCO₂/m²": "Carbono Incorporado (Kg CO₂/m²)",
  "MJ/m²": "Energia Incorporada (MJ/m²)",
} as const;

// Constants
const DEFAULT_COLORS = {
  START: "#3b82f6",
  END: "#E36F35",
  PROCEL: ["#14400D", "#6B9215", "#F2E530", "#F28C0F", "#D90D0D"],
  GRID: "#e2e8f0",
  TEXT: "#64748b",
  STROKE: "#999999cc",
} as const;

const CHART_CONFIG = {
  BAR_WIDTH: { expanded: 22, normal: 8 },
  CIRCLE_RADIUS: { expanded: 10, normal: 5 },
  STROKE_WIDTH: { expanded: 4, normal: 2 },
  POLYNOMIAL_ORDER: 4,
} as const;

// Types
type DataPoint = { x: number; y: number };

type ChartData = {
  id: string;
  y: number;
  min: number;
  max: number;
  label: string;
};

type D3GradientRangeChartProps = {
  selectedBars?: string[];
  data?: ChartData[];
  width?: number;
  height?: number;
  overrideDimensions?: boolean;
  customData?: any;
  unit?: string;
};

type TooltipData = {
  x: number;
  y: number;
  value: {
    min: number;
    max: number;
    label?: string;
  };
};

// Custom hooks
const useChartDimensions = (
  props: Pick<D3GradientRangeChartProps, 'width' | 'height'>,
  overrideDimensions: boolean,
  isMobile: boolean,
  isExpanded: boolean
) => {
  return useMemo(() => {
    const screenWidth = window.innerWidth;
    
    const width = () => {
      if (props.width && overrideDimensions) return props.width;
      if (isMobile) return screenWidth * 0.53;
      if (isExpanded) return screenWidth * 0.8;
      if (screenWidth < 1300) return screenWidth * 0.35;
      return screenWidth * 0.5;
    };

    const height = () => {
      if (props.height && overrideDimensions) return props.height;
      if (isMobile && !isExpanded) return 250;
      if (isMobile && isExpanded) return 320;
      if (isExpanded) return window.innerHeight * 0.96 - 130;
      return window.innerHeight * 0.7 - 230;
    };

    const margin = {
      top: isExpanded ? 15 : 20,
      right: 20,
      bottom: 35,
      left: isMobile ? 50 : 80,
    };

    const _width = width();
    const _height = height() - (margin.top + margin.bottom);

    return { width: _width, height: _height, margin };
  }, [props.width, props.height, overrideDimensions, isMobile, isExpanded]);
};

const useTooltipPosition = () => {
  return useCallback((event: MouseEvent, svgRef: React.RefObject<SVGSVGElement | null>) => {
    if (!svgRef.current) return { x: 0, y: 0 };

    const { left, top, width, height } = svgRef.current.getBoundingClientRect();
    const mouseX = event.clientX - left;
    const mouseY = event.clientY - top;

    const tooltipWidth = 120;
    const tooltipHeight = 80;
    const offset = 10;

    let x = mouseX + offset;
    if (mouseX + tooltipWidth + offset > width) {
      x = mouseX - tooltipWidth - offset;
    }

    let y = mouseY - offset;
    if (mouseY + tooltipHeight > height) {
      y = height - tooltipHeight - (offset + 20);
    }
    if (mouseY < offset) {
      y = offset;
    }

    return { x, y };
  }, []);
};

const D3GradientRangeLineChart: React.FC<D3GradientRangeChartProps> = ({
  selectedBars = [],
  data = [],
  overrideDimensions = false,
  unit = "",
  ...props
}) => {
  const { isExpanded } = useSummary();
  const svgRef = useRef<SVGSVGElement>(null);
  const isMobile = useIsMobile();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isResized, setIsResized] = useState(0);

  const { width: _width, height: _height, margin } = useChartDimensions(
    props,
    overrideDimensions,
    isMobile,
    isExpanded
  );

  const getTooltipPosition = useTooltipPosition();

  // Data transformations
  const reversedData = useMemo(() => 
    data
      ?.map((f) => ({ ...f, y: 1 - f.y }))
      .sort((a, b) => a.min - b.min) || [],
    [data]
  );

  const { minValue, maxValue, minOfMins, maxOfMins } = useMemo(() => {
    const maxValues = reversedData.map((d) => d.max);
    const minValues = reversedData.map((d) => d.min);
    
    return {
      minValue: Math.min(...maxValues),
      maxValue: Math.max(...maxValues),
      minOfMins: Math.min(...minValues),
      maxOfMins: Math.max(...minValues),
    };
  }, [reversedData]);

  // Polynomial regression
  const { denormalizedMax, denormalizedMin } = useMemo(() => {
    if (!reversedData.length) return { denormalizedMax: [], denormalizedMin: [] };

    const normalized = reversedData.map((d) => ({
      x: d.y,
      y: (d.max - minValue) / (maxValue - minValue),
    }));

    const normalizedMin = reversedData.map((d) => ({
      x: d.y,
      y: (d.min - minOfMins) / (maxOfMins - minOfMins),
    }));

    const poly = regressionPoly()
      .x((d: DataPoint) => d.x)
      .y((d: DataPoint) => d.y)
      .order(CHART_CONFIG.POLYNOMIAL_ORDER);

    const fittedMax = poly(normalized);
    const fittedMin = poly(normalizedMin);

    let denormMax = fittedMax.map(([x, y]: [number, number]) => ({
      x,
      y: y * (maxValue - minValue) + minValue,
    }));

    let denormMin = fittedMin.map(([x, y]: [number, number]) => ({
      x,
      y: y * (maxOfMins - minOfMins) + minOfMins,
    }));

    const xMin = d3.min([...denormMin, ...denormMax], (d: DataPoint) => d.x) ?? 0;
    const xMax = d3.max([...denormMin, ...denormMax], (d: DataPoint) => d.x) ?? 1;
    const normalizeX = (x: number) => (x - xMin) / (xMax - xMin);

    denormMax = denormMax.map((d: DataPoint) => ({
      x: normalizeX(d.x),
      y: d.y,
    }));

    denormMin = denormMin.map((d: DataPoint) => ({
      x: normalizeX(d.x),
      y: d.y,
    }));

    return { denormalizedMax: denormMax, denormalizedMin: denormMin };
  }, [reversedData, minValue, maxValue, minOfMins, maxOfMins]);

  // Scales
  const xScale = useMemo(() => 
    d3.scaleLinear().domain([0, 1]).range([0, _width]),
    [_width]
  );

  const yScale = useMemo(() => 
    d3.scaleLinear().domain([0, maxValue * 1.05]).range([0, _height]),
    [maxValue, _height]
  );

  const colorScale = useMemo(() => 
    d3.scaleLinear<string>()
      .domain([
        maxValue * 0.2,
        maxValue * 0.4,
        maxValue * 0.6,
        maxValue * 0.8,
        maxValue,
      ])
      .range(DEFAULT_COLORS.PROCEL),
    [maxValue]
  );

  // Event handlers
  const handleMouseMove = useCallback((event: any) => {
    if (!svgRef.current) return;
    
    const g = d3.select(svgRef.current).select("g");
    const [mx] = d3.pointer(event, g.node());
    const x0 = xScale.invert(mx);

    const getClosest = (data: DataPoint[], x: number) => {
      const bisect = d3.bisector((d: DataPoint) => d.x).center;
      const i = bisect(data, x);
      const clamp = (idx: number) => Math.max(0, Math.min(idx, data.length - 1));
      return data[clamp(i)];
    };

    const dMax = getClosest(denormalizedMax, x0);
    const dMin = getClosest(denormalizedMin, x0);

    const position = getTooltipPosition(event, svgRef);
    setTooltip({
      ...position,
      value: {
        min: dMin.y,
        max: dMax.y,
      },
    });

    // Update lines
    const g_elem = d3.select(svgRef.current).select("g");
    g_elem.select(".tooltip-line-vertical")
      .attr("x1", xScale(x0))
      .attr("x2", xScale(x0))
      .style("opacity", 1);

    g_elem.select(".tooltip-line-horizontal")
      .attr("y1", yScale(dMax.y))
      .attr("y2", yScale(dMax.y))
      .style("opacity", 1);

    g_elem.select(".tooltip-line-horizontal2")
      .attr("y1", yScale(dMin.y))
      .attr("y2", yScale(dMin.y))
      .style("opacity", 1);
  }, [xScale, yScale, denormalizedMax, denormalizedMin, getTooltipPosition]);

  const handleMouseOut = useCallback(() => {
    setTooltip(null);
    
    const g = d3.select(svgRef.current).select("g");
    g.select(".tooltip-line-vertical").style("opacity", 0);
    g.select(".tooltip-line-horizontal").style("opacity", 0);
    g.select(".tooltip-line-horizontal2").style("opacity", 0);
  }, []);

  // Resize handler
  const debouncedResize = useMemo(
    () => debounce(() => setIsResized((prev) => prev + 1), 50),
    []
  );

  useEffect(() => {
    window.addEventListener("resize", debouncedResize);
    return () => window.removeEventListener("resize", debouncedResize);
  }, [debouncedResize]);

  // Main chart effect
  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", _width + margin.left + margin.right + 20)
      .attr("height", _height + margin.top + margin.bottom);

    // Main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip lines
    g.append("line")
      .attr("class", "tooltip-line-vertical")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1)
      .attr("y1", 0)
      .attr("y2", _height)
      .style("opacity", 0);

    g.append("line")
      .attr("class", "tooltip-line-horizontal")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("x1", 0)
      .attr("x2", _width)
      .style("opacity", 0);

    g.append("line")
      .attr("class", "tooltip-line-horizontal2")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("x1", 0)
      .attr("x2", _width)
      .style("opacity", 0);

    // Interaction area
    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", _width)
      .attr("height", _height)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", handleMouseMove)
      .on("mouseleave", handleMouseOut);

    // Grid lines
    const xTicks = xScale.ticks(isExpanded ? 30 : 10);
    const yTicks = yScale.ticks(12);

    g.selectAll(".grid-line-x")
      .data(xTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-x")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", _height)
      .attr("stroke", DEFAULT_COLORS.GRID)
      .attr("stroke-width", 1);

    g.selectAll(".grid-line-y")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", _width)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", DEFAULT_COLORS.GRID)
      .attr("stroke-width", 1);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${_height})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", DEFAULT_COLORS.TEXT);

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(8))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", DEFAULT_COLORS.TEXT);

    // Procel color bands
    const faixaHeight = _width / DEFAULT_COLORS.PROCEL.length;

    DEFAULT_COLORS.PROCEL.slice()
      .reverse()
      .forEach((color, i) => {
        g.append("rect")
          .attr("y", _height - 10)
          .attr("x", i * faixaHeight)
          .attr("width", faixaHeight)
          .attr("height", 10)
          .attr("fill", color)
          .attr("opacity", 0.5);
      });

    // Regression lines
    const lineGenerator = d3
      .line<DataPoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveBasis);

    svg
      .append("path")
      .datum(denormalizedMin)
      .attr("fill", "none")
      .attr("stroke", DEFAULT_COLORS.START)
      .attr("stroke-width", 4)
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("d", lineGenerator)
      .lower();

    svg
      .append("path")
      .datum(denormalizedMax)
      .attr("fill", "none")
      .attr("stroke", DEFAULT_COLORS.END)
      .attr("stroke-width", 4)
      .attr("stroke-dasharray", "6 3")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("d", lineGenerator)
      .lower();
  }, [
    isExpanded,
    data,
    isResized,
    _width,
    _height,
    margin,
    xScale,
    yScale,
    denormalizedMax,
    denormalizedMin,
    handleMouseMove,
    handleMouseOut,
  ]);

  // Selected bars effect
  useEffect(() => {
    if (!svgRef.current || !reversedData.length) return;
    
    const g = d3.select(svgRef.current).select("g");
    if (g.empty()) return;

    reversedData.forEach((d, i) => {
      const gradientId = `gradient-${i}`;
      const isSelected = selectedBars.includes(d.id);

      if (isSelected) {
        // Create gradient
        const gradient = g
          .append("defs")
          .append("linearGradient")
          .attr("id", gradientId)
          .attr("x1", "50%")
          .attr("x2", "50%")
          .attr("y1", "0%")
          .attr("y2", "100%");

        const startColor = colorScale(d.min);
        const endColor = colorScale(d.max);

        gradient
          .append("stop")
          .attr("offset", "0%")
          .attr("stop-color", startColor);

        gradient
          .append("stop")
          .attr("offset", "100%")
          .attr("stop-color", endColor);

        // Draw bar
        const x = xScale(d.y);
        const y1 = yScale(d.min);
        const y2 = yScale(d.max);
        const minimalBarHeight = CHART_CONFIG.BAR_WIDTH.normal;

        if (isExpanded) {
          g.append("rect")
            .attr("x", x - (CHART_CONFIG.BAR_WIDTH.expanded / 2) + 1)
            .attr("y", y1)
            .attr("width", CHART_CONFIG.BAR_WIDTH.expanded)
            .attr("height", y2 - y1)
            .attr("fill", `url(#${gradientId})`)
            .attr("id", `bar-${d.id}`)
            .attr("stroke", DEFAULT_COLORS.STROKE)
            .attr("stroke-width", 2)
            .raise();
        } else {
          g.append("rect")
            .attr("x", x)
            .attr("y", y1 - minimalBarHeight / 2 - 2)
            .attr("width", minimalBarHeight)
            .attr("height", y2 - y1 + 4)
            .attr("fill", `url(#${gradientId})`)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("id", `bar-${d.id}`)
            .attr("stroke", DEFAULT_COLORS.STROKE)
            .attr("stroke-width", 0.1)
            .raise();
        }

        // Circles
        const circleX = x + (isExpanded ? 0 : minimalBarHeight / 2);
        
        g.append("circle")
          .attr("cx", circleX)
          .attr("cy", y1)
          .attr("r", isExpanded ? CHART_CONFIG.CIRCLE_RADIUS.expanded : CHART_CONFIG.CIRCLE_RADIUS.normal)
          .attr("fill", DEFAULT_COLORS.START)
          .attr("stroke", "white")
          .attr("stroke-width", isExpanded ? CHART_CONFIG.STROKE_WIDTH.expanded : CHART_CONFIG.STROKE_WIDTH.normal)
          .attr("id", `bar-circle-start-${d.id}`)
          .raise();

        g.append("circle")
          .attr("cx", circleX)
          .attr("cy", y2)
          .attr("r", isExpanded ? CHART_CONFIG.CIRCLE_RADIUS.expanded : CHART_CONFIG.CIRCLE_RADIUS.normal)
          .attr("fill", DEFAULT_COLORS.END)
          .attr("stroke", "white")
          .attr("stroke-width", isExpanded ? CHART_CONFIG.STROKE_WIDTH.expanded : CHART_CONFIG.STROKE_WIDTH.normal)
          .attr("id", `bar-circle-end-${d.id}`)
          .raise();

        // Label
        const labelOffset = isExpanded ? CHART_CONFIG.BAR_WIDTH.expanded : minimalBarHeight;
        g.append("text")
          .attr("x", x + labelOffset - 20)
          .attr("y", y1 + (isExpanded ? CHART_CONFIG.BAR_WIDTH.expanded + 4 : minimalBarHeight))
          .attr("text-anchor", "end")
          .attr("font-size", 12)
          .attr("font-weight", "normal")
          .attr("fill", "var(--primary)")
          .attr("transform", `rotate(90, ${x + labelOffset}, ${y1})`)
          .text(`${d.label} -> `)
          .attr("id", `bar-label-min-${d.id}`);

        // Project name (expanded only)
        if (isExpanded) {
          g.append("text")
            .attr("x", (y1 + y2) / 2)
            .attr("y", x + 5)
            .attr("text-anchor", "middle")
            .attr("font-size", 14)
            .attr("font-weight", "bold")
            .attr("fill", "#FFF")
            .text(`${d.label}`)
            .attr("id", `bar-label-name-${d.id}`);
        }
      } else {
        // Remove elements for unselected bars
        const idsToRemove = [
          `bar-${d.id}`,
          `bar-label-min-${d.id}`,
          `bar-label-max-${d.id}`,
          `bar-label-name-${d.id}`,
          `bar-circle-start-${d.id}`,
          `bar-circle-end-${d.id}`,
        ];

        g.selectAll("*")
          .filter(function () {
            const node = d3.select(this);
            return idsToRemove.includes(node.attr("id"));
          })
          .remove();
      }
    });
  }, [selectedBars, isExpanded, reversedData, isResized, xScale, yScale, colorScale]);

    const labelX = UNIT_LABELS[unit as keyof typeof UNIT_LABELS] || "Carbono Incorporado";

  return (
    <Card className={cn("shadow-none w-min-content")}>
      {/* <CardHeader>
        <CardTitle className="block w-full text-center">
          Cumulative x KgCO2/m2
        </CardTitle>
      </CardHeader> */}
      <CardContent>
        <div className="w-full overflow-hidden relative">
          <span className="absolute w-full text-center text-black/70 block rotate-270  left-0 -translate-x-[47%] -translate-y-1/2 top-1/2 h-8 m-0 p-0">
            {labelX}
          </span>
          <svg ref={svgRef} className="bg-white dark:bg-sidebar"></svg>
          {tooltip && (
            <div
              className="absolute bg-gray-800 text-white text-sm p-3 rounded pointer-events-none transition-opacity duration-200 flex flex-col gap-2 z-400"
              style={{
                left: tooltip.x + 10,
                top: tooltip.y + 10,
              }}
            >
              {tooltip.value.label && (
                <>
                  <span className="font-bold">{tooltip.value.label}</span>
                  <Divider />
                </>
              )}
              <span>
                Min: <b>{tooltip.value.min.toFixed(3)} Kg/m2</b>
              </span>
              <span>
                Max: <b>{tooltip.value.max.toFixed(3)} Kg/m2</b>
              </span>
            </div>
          )}
        </div>
        <div className="flex">
          <span>N: {data?.length}</span>
          <span className="flex-1 text-center w-full text-black/70">
            potencial de mitigação
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default D3GradientRangeLineChart;

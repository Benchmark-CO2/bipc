import { IBenchmarkItem } from "@/actions/benchmarks/types";
import { Card, CardContent } from "@/components/ui/card";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import * as d3 from "d3";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Indicators from "./components/indicators";

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

// Constants
const DEFAULT_COLORS = {
  START: "#3b82f6",
  END: "#E36F35",
  GRADIENT_RANGE: [
    "#3b82f6",
    "hsl(97, 40%, 50%)",
    "hsl(55, 40%, 55%)",
    "hsl(0, 40%, 50%)",
  ],
  GRID: "#e2e8f0",
  TEXT: "#64748b",
  STROKE: "#2563eb",
} as const;

const CHART_CONFIG = {
  BAR_HEIGHT: 18,
  MINIMAL_BAR_HEIGHT: 5,
  CIRCLE_RADIUS: { expanded: 6, normal: 3 },
  TOOLTIP_DIMENSIONS: { width: 120, height: 40, offset: 10 },
} as const;

const UNIT_LABELS = {
  "KgCO₂/m²": "Carbono Incorporado (Kg CO₂/m²)",
  "MJ/m²": "Energia Incorporada (MJ/m²)",
} as const;

// Types
type ChartData = IBenchmarkItem & {
  label: string;
};

type D3GradientRangeChartProps = {
  selectedBars?: string[];
  data?: ChartData[];
  width?: number;
  height?: number;
  overrideDimensions?: boolean;
  unit?: string;
  totalProjects: number;
  minData: number[];
  maxData: number[];
};
// Custom hooks
const useChartDimensions = (
  props: Pick<D3GradientRangeChartProps, "width" | "height">,
  overrideDimensions: boolean,
  isMobile: boolean,
  isExpanded: boolean,
  hasLessValue: boolean,
  hasMoreValue: boolean
) => {
  return useMemo(() => {
    const screenWidth = window.innerWidth;

    const width = () => {
      if (props.width && overrideDimensions) return props.width;
      if (isMobile) return screenWidth * 0.6;
      if (isExpanded) return screenWidth * 0.8;
      if (screenWidth < 1300) return screenWidth * 0.35;
      if (screenWidth > 1300) return screenWidth * 0.4;
      return screenWidth * (hasLessValue || hasMoreValue ? 0.5 : 0.5);
    };

    const height = () => {
      if (props.height && overrideDimensions) return props.height;
      if (isMobile && !isExpanded) return 250;
      if (isMobile && isExpanded) return 320;
      if (isExpanded) return window.innerHeight * 0.96 - 130;
      return window.innerHeight * 0.7 - 340;
    };

    const margin = {
      top: isExpanded ? 15 : 20,
      right: isMobile ? 0 : 20,
      bottom: isMobile ? 20 : 35,
      left: isMobile ? 45 : 80,
    };

    const _width = width();
    const _height = height() - (margin.top + margin.bottom);

    return { width: _width, height: _height, margin };
  }, [
    props.width,
    props.height,
    overrideDimensions,
    isMobile,
    isExpanded,
    hasLessValue,
    hasMoreValue,
  ]);
};

const useTooltipPosition = () => {
  return useCallback(
    (event: MouseEvent, canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
      if (!canvasRef.current) return { x: 0, y: 0 };

      const { left, top, width, height } =
        canvasRef.current.getBoundingClientRect();
      const mouseX = event.clientX - left;
      const mouseY = event.clientY - top;

      const tooltipWidth = CHART_CONFIG.TOOLTIP_DIMENSIONS.width;
      const tooltipHeight = CHART_CONFIG.TOOLTIP_DIMENSIONS.height;
      const offset = CHART_CONFIG.TOOLTIP_DIMENSIONS.offset;

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
    },
    []
  );
};

const D3GradientRangeChart: React.FC<D3GradientRangeChartProps> = ({
  selectedBars = [],
  data = [],
  overrideDimensions = false,
  unit = "",
  totalProjects,
  minData,
  maxData,
  ...props
}) => {
  const { isExpanded } = useSummary();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: { min: number; max: number; label?: string };
  } | null>(null);
  const [brushSelectionCount, setBrushSelectionCount] = useState<number>(0);
  const brushSelectionCountRef = useRef<number>(0);
  const [hasZoomed, setHasZoomed] = useState(false);
  const transformRef = useRef({ k: 1, x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  // Inicializar o contador com o total de dados
  useEffect(() => {
    setBrushSelectionCount(data.length);
    brushSelectionCountRef.current = data.length;
  }, [data.length]);

  // Função auxiliar para atualizar o contador
  const updateBrushCount = useCallback((count: number) => {
    brushSelectionCountRef.current = count;
    setBrushSelectionCount(count);
  }, []);

  const minLessDataValue = useMemo(() => Math.min(...minData), [minData]);
  const maxLessDataValue = useMemo(() => Math.max(...minData), [minData]);
  const maxMaxDataValue = useMemo(() => Math.max(...maxData), [maxData]);
  const hasLessValue =
    totalProjects > 0
      ? parseFloat((minData[0] || 0).toFixed(2)) < minLessDataValue
      : false;
  const hasMoreValue =
    totalProjects > 0
      ? parseFloat((maxData[maxData.length - 1] || 0).toFixed(2)) >
        maxMaxDataValue
      : false;

  const {
    width: _width,
    height: _height,
    margin,
  } = useChartDimensions(
    props,
    overrideDimensions,
    isMobile,
    isExpanded,
    hasLessValue,
    hasMoreValue
  );

  // Scales and calculations
  const maxValue = useMemo(
    () =>
      (data?.map((d) => d.max).reduce((a, b) => Math.max(a, b), 0) || 170) *
      1.1,
    [data]
  );

  const xScale = useMemo(() => {
    // Ensure we have a valid width before creating the scale
    const width = _width > 0 ? _width : 400; // fallback width
    return d3
      .scaleLinear()
      .domain([0, maxValue * 1.15])
      .range([0, width * 1.1]);
  }, [maxValue, _width]);

  const yScale = useMemo(() => {
    // Y values are normalized between 0 and 1
    return d3.scaleLinear().domain([0, 1.01]).range([_height, 0]);
  }, [_height]);

  const colorScale = useMemo(
    () =>
      d3
        .scaleLinear<string>()
        .domain([0, maxValue * 0.25, maxValue * 0.5, maxValue])
        .range(DEFAULT_COLORS.GRADIENT_RANGE),
    [maxValue]
  );

  const getTooltipPosition = useTooltipPosition();

  // Helper function to get data point under mouse
  const getDataAtPosition = useCallback(
    (mouseX: number, mouseY: number) => {
      const transform = transformRef.current;
      const newXScale = d3.scaleLinear()
        .domain(xScale.domain())
        .range(xScale.range().map(r => r * transform.k + transform.x));
      const newYScale = d3.scaleLinear()
        .domain(yScale.domain())
        .range(yScale.range().map(r => r * transform.k + transform.y));

      // Check if mouse is near any data point
      for (const d of data) {
        const x1 = newXScale(d.min);
        const x2 = newXScale(d.max);
        const y = newYScale(d.y);
        const radius = isExpanded ? CHART_CONFIG.CIRCLE_RADIUS.expanded : CHART_CONFIG.CIRCLE_RADIUS.normal;

        // Check start circle
        const distStart = Math.sqrt(Math.pow(mouseX - x1, 2) + Math.pow(mouseY - y, 2));
        if (distStart <= radius + 5) return d;

        // Check end circle
        const distEnd = Math.sqrt(Math.pow(mouseX - x2, 2) + Math.pow(mouseY - y, 2));
        if (distEnd <= radius + 5) return d;

        // Check bar area (if expanded or selected)
        if (isExpanded || selectedBars.includes(d.id)) {
          const barHeight = isExpanded ? CHART_CONFIG.BAR_HEIGHT : CHART_CONFIG.MINIMAL_BAR_HEIGHT;
          if (mouseX >= x1 && mouseX <= x2 && Math.abs(mouseY - y) <= barHeight / 2) {
            return d;
          }
        }
      }
      return null;
    },
    [data, xScale, yScale, isExpanded, selectedBars]
  );

  // Event handlers
  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (event.clientX - rect.left) - margin.left;
      const mouseY = (event.clientY - rect.top) - margin.top;

      const d = getDataAtPosition(mouseX, mouseY);
      
      if (d) {
        const position = getTooltipPosition(event, canvasRef);
        setTooltip({
          ...position,
          value: {
            min: d.min,
            max: d.max,
            label: selectedBars?.includes(d.id) ? d.label : undefined,
          },
        });
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'pointer';
        }
      } else {
        setTooltip(null);
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
      }
    },
    [getDataAtPosition, getTooltipPosition, selectedBars, margin, canvasRef]
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setTooltip(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  }, []);

  // Canvas drawing function
  const drawChart = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Polyfill for roundRect if not available
    if (!ctx.roundRect) {
      (ctx as any).roundRect = function(x: number, y: number, width: number, height: number, radius: number | number[]) {
        const r = typeof radius === 'number' ? radius : radius[0];
        this.beginPath();
        this.moveTo(x + r, y);
        this.lineTo(x + width - r, y);
        this.quadraticCurveTo(x + width, y, x + width, y + r);
        this.lineTo(x + width, y + height - r);
        this.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        this.lineTo(x + r, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        this.closePath();
      };
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#18181b' : '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Save context for transformations
    ctx.save();
    ctx.translate(margin.left, margin.top);

    // Apply zoom transform
    const transform = transformRef.current;
    const newXScale = d3.scaleLinear()
      .domain(xScale.domain())
      .range(xScale.range().map(r => r * transform.k + transform.x));
    const newYScale = d3.scaleLinear()
      .domain(yScale.domain())
      .range(yScale.range().map(r => r * transform.k + transform.y));

    // Draw grid lines
    ctx.strokeStyle = DEFAULT_COLORS.GRID;
    ctx.lineWidth = 1;

    // Vertical grid lines
    const xTicks = newXScale.ticks(isExpanded ? 30 : 10);
    xTicks.forEach(tick => {
      const x = newXScale(tick);
      if (x >= 0 && x <= _width) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, _height);
        ctx.stroke();
      }
    });

    // Horizontal grid lines
    const yTicks = newYScale.ticks(8);
    yTicks.forEach(tick => {
      const y = newYScale(tick);
      if (y >= 0 && y <= _height) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(_width, y);
        ctx.stroke();
      }
    });

    // Draw data points
    data.forEach((d) => {
      const x1 = newXScale(d.min);
      const x2 = newXScale(d.max);
      const y = newYScale(d.y);

      // Skip if outside visible area
      if (x2 < 0 || x1 > _width || y < 0 || y > _height) return;

      const isSelected = selectedBars.includes(d.id);

      // Draw bar if expanded or selected
      if (isExpanded || isSelected) {
        const barHeight = isExpanded ? CHART_CONFIG.BAR_HEIGHT : CHART_CONFIG.MINIMAL_BAR_HEIGHT;
        
        // Create gradient for bar
        const gradient = ctx.createLinearGradient(x1, y, x2, y);
        gradient.addColorStop(0, colorScale(d.min));
        gradient.addColorStop(1, colorScale(d.max));

        ctx.fillStyle = gradient;
        
        if (isExpanded) {
          ctx.beginPath();
          ctx.roundRect(x1 - 12, y - (barHeight + 4) / 2, x2 - x1 + 24, barHeight + 4, 15);
          ctx.fill();
          
          if (isSelected) {
            ctx.strokeStyle = DEFAULT_COLORS.STROKE;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.roundRect(x1, y - barHeight / 2, x2 - x1, barHeight, 5);
          ctx.fill();
          
          if (isSelected) {
            ctx.strokeStyle = DEFAULT_COLORS.STROKE;
            ctx.lineWidth = 0.1;
            ctx.stroke();
          }
        }
      }

      // Draw circles
      const radius = isExpanded ? CHART_CONFIG.CIRCLE_RADIUS.expanded : CHART_CONFIG.CIRCLE_RADIUS.normal;
      const strokeWidth = isExpanded ? (isMobile ? 1 : 2) : 0;

      // Start circle
      ctx.beginPath();
      ctx.arc(x1, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = DEFAULT_COLORS.START;
      ctx.fill();
      if (strokeWidth > 0 || isSelected) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = isSelected ? strokeWidth : strokeWidth;
        ctx.stroke();
      }

      // End circle
      ctx.beginPath();
      ctx.arc(x2, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = DEFAULT_COLORS.END;
      ctx.fill();
      if (strokeWidth > 0 || isSelected) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = isSelected ? strokeWidth : (isExpanded ? (isMobile ? 1 : 0.5) : 0);
        ctx.stroke();
      }

      // Draw labels for selected bars
      if (isSelected) {
        const avgX = (x1 + x2) / 2;
        const isMoreThanHalf = avgX < (maxValue ? maxValue * 0.5 : 0);
        
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary') || DEFAULT_COLORS.TEXT;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'end';
        ctx.fillText(d.min.toInternational(undefined, 0), x1 - 18, y + 4);
        
        ctx.textAlign = 'start';
        ctx.fillText(d.max.toInternational(undefined, 0), x2 + 18, y + 4);
        
        ctx.font = 'normal 12px sans-serif';
        ctx.fillText(
          `${isMoreThanHalf ? "<--" : ""} ${d.label} ${!isMoreThanHalf ? "-->" : ""}`,
          isMoreThanHalf ? x2 + 150 : x1 - 150,
          y + 4
        );

        if (isExpanded) {
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(d.label, avgX, y + 5);
        }
      }
    });

    ctx.restore();

    // Draw axes (outside clipped area)
    ctx.save();
    ctx.translate(margin.left, margin.top);

    // Draw X-axis line
    ctx.strokeStyle = DEFAULT_COLORS.TEXT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, _height);
    ctx.lineTo(_width, _height);
    ctx.stroke();

    // Draw Y-axis line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, _height);
    ctx.stroke();

    // X-axis ticks and labels
    ctx.fillStyle = DEFAULT_COLORS.TEXT;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const xAxisTicks = newXScale.ticks(Math.min(10, Math.floor(_width / 60)));
    xAxisTicks.forEach(tick => {
      const x = newXScale(tick);
      if (x >= 0 && x <= _width) {
        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(x, _height);
        ctx.lineTo(x, _height + 6);
        ctx.stroke();
        
        // Draw label
        ctx.fillText((tick as number).toInternational(), x, _height + 8);
      }
    });

    // Y-axis ticks and labels
    ctx.textAlign = 'end';
    ctx.textBaseline = 'middle';

    const yAxisTicks = newYScale.ticks(8);
    yAxisTicks.forEach(tick => {
      const y = newYScale(tick);
      if (y >= 0 && y <= _height) {
        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(-6, y);
        ctx.lineTo(0, y);
        ctx.stroke();
        
        // Draw label
        ctx.fillText((tick as number).toInternational(), -10, y);
      }
    });

    ctx.restore();

    // Count visible points
    const [x0, x1] = newXScale.domain();
    const [y0, y1] = newYScale.domain();
    const countInView = data.filter((d) => {
      const xInRange = d.min >= x0 && d.max <= x1;
      const yInRange = d.y >= y0 && d.y <= y1;
      return xInRange && yInRange;
    }).length;
    updateBrushCount(countInView);

  }, [canvasRef, margin, xScale, yScale, _width, _height, data, selectedBars, isExpanded, isMobile, colorScale, maxValue, updateBrushCount]);

  // Resize handler
  const debouncedResizeRef = useMemo(
    () =>
      debounce(() => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(drawChart);
      }, 50),
    [drawChart]
  );

  useEffect(() => {
    window.addEventListener("resize", debouncedResizeRef);
    return () => window.removeEventListener("resize", debouncedResizeRef);
  }, [debouncedResizeRef]);

  // ResizeObserver to watch parent element changes
  useEffect(() => {
    if (!containerRef.current) return;

    let resizeTimer: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(drawChart);
      }, 150);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
    };
  }, [drawChart]);

  // Main chart effect with Canvas and Zoom
  useEffect(() => {
    if (!canvasRef.current) return;

    // Initial draw
    drawChart();

    const canvas = canvasRef.current;

    // Zoom behavior for canvas
    const zoom = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([1, 10])
      .wheelDelta((event) => {
        const sensitivity = event.shiftKey ? 250 : 700;
        return -event.deltaY / sensitivity;
      })
      .filter((event) => {
        return !event.button && event.type !== "dblclick";
      })
      .on("zoom", (event) => {
        const transform = event.transform;
        transformRef.current = { k: transform.k, x: transform.x, y: transform.y };
        
        // Check if zoomed
        const isZoomed = transform.k !== 1 || transform.x !== 0 || transform.y !== 0;
        setHasZoomed(isZoomed);

        // Redraw with animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(drawChart);
      });

    // Apply zoom to canvas
    d3.select(canvas).call(zoom as any);

    // Double click to reset zoom
    const handleDoubleClick = () => {
      d3.select(canvas)
        .transition()
        .duration(750)
        .call(zoom.transform as any, d3.zoomIdentity);
      
      transformRef.current = { k: 1, x: 0, y: 0 };
      updateBrushCount(data.length);
      setHasZoomed(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(drawChart);
    };

    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove as any);
    canvas.addEventListener('mouseleave', handleCanvasMouseLeave);

    // Cleanup
    return () => {
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('mousemove', handleCanvasMouseMove as any);
      canvas.removeEventListener('mouseleave', handleCanvasMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    drawChart,
    handleCanvasMouseMove,
    handleCanvasMouseLeave,
    data.length,
    updateBrushCount,
  ]);

  // Redraw when selectedBars changes
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(drawChart);
  }, [selectedBars, drawChart]);

  const labelX =
    UNIT_LABELS[unit as keyof typeof UNIT_LABELS] || "Carbono Incorporado";

  return (
    <Card className={cn("shadow-none w-min-content min-w-1/2")}>
      <CardContent>
        <div ref={containerRef} className="w-full overflow-hidden relative">
          <span className="absolute text-xs w-full text-center text-foreground/70 block rotate-270 left-0 -translate-x-[47%] -translate-y-1/2 top-1/2 h-8 m-0 p-0">
            Potencial de mitigação
          </span>

          <Indicators
            max={maxLessDataValue}
            min={minLessDataValue}
            hasZoomed={hasZoomed}
            position="end"
          />

          <canvas 
            ref={canvasRef} 
            className="bg-white dark:bg-zinc-900 w-full cursor-grab active:cursor-grabbing"
            style={{
              width: '100%',
              height: _height + margin.top + margin.bottom,
            }}
          />

          {!isMobile && (
            <Indicators
              max={maxLessDataValue}
              min={minLessDataValue}
              hasZoomed={hasZoomed}
              position="start"
            />
          )}

          {tooltip && (
            <div
              className="absolute bg-gray-800 text-white text-sm p-3 rounded pointer-events-none transition-opacity duration-200 flex flex-col gap-2 z-400"
              style={{
                left: tooltip.x + 10,
                top: tooltip.y + 10,
              }}
            >
              <span>
                Min:{" "}
                <b>
                  {tooltip.value.min.toInternational()} {unit}
                </b>
              </span>
              <span>
                Max:{" "}
                <b>
                  {tooltip.value.max.toInternational()} {unit}
                </b>
              </span>
            </div>
          )}
        </div>

        <div className="flex max-sm:flex-col-reverse max-sm:gap-4 max-sm:mt-2">
          <span className="text-xs">
            Exibindo: {brushSelectionCount} / {data?.length || 0}
          </span>
          {isMobile && (
            <Indicators
              max={maxLessDataValue}
              min={minLessDataValue}
              hasZoomed={hasZoomed}
              position="start"
            />
          )}
          <span className="flex-1 text-xs text-center w-full text-foreground/70">
            {labelX}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default D3GradientRangeChart;

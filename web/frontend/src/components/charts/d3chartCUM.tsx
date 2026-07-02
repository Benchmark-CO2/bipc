import { IBenchmarkItem } from "@/actions/benchmarks/types";
import { Card, CardContent } from "@/components/ui/card";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTranslation } from "@/i18n";
import { Translations } from "@/i18n/translations/pt-BR";
import { cn } from "@/lib/utils";
import { structureTypes } from "@/utils/structureTypes";
import * as d3 from "d3";
import { regressionPoly } from "d3-regression";
import { Search, SearchX } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Indicators from "./components/indicators";

// Utility: Debounce function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Constants
const DEFAULT_COLORS = {
  START: "#3b82f6",
  END: "#E36F35",
  GRAY_START: "#94a3b8",
  GRAY_END: "#64748b",
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

const PROCEL_SCALE_CONFIG = {
  WIDTH: 28,
  TICK_SIZE: 4,
} as const;

const PROCEL_CLASSES = [
  { label: "A", color: "#00A650" },
  { label: "B", color: "#8DC63F" },
  { label: "C", color: "#FFF200" },
  { label: "D", color: "#F26522" },
] as const;

const PROCEL_CLASSES_5 = [
  { label: "A", color: "#00A650" },
  { label: "B", color: "#8DC63F" },
  { label: "C", color: "#FFF200" },
  { label: "D", color: "#F26522" },
  { label: "E", color: "#ED1C24" },
] as const;

const UNIT_LABELS = (t: Translations) => ({
  "KgCO₂/m²": `${t.benchmark.chartTypes.cumulativeFraction.xAxisLabelCarbon} (kg CO₂/m²)`,
  "MJ/m²": `${t.benchmark.chartTypes.cumulativeFraction.xAxisLabelEnergy} (MJ/m²)`,
}) as const;

// Types
type ChartData = IBenchmarkItem & {
  label: string;
  floors?: string | number;
  technology?: string[];
  minId?: string;
  maxId?: string;
  value?: number;
};

type D3RangeChartProps = {
  /** Chart variant: "range" shows min/max pairs, "cumulative" shows single-value gray dots */
  variant?: "range" | "cumulative";
  selectedBars?: string[];
  selectedMinBars?: string[];
  selectedMaxBars?: string[];
  data?: ChartData[];
  width?: number;
  height?: number;
  overrideDimensions?: boolean;
  unit?: string;
  totalProjects: number;
  minData?: number[];
  maxData?: number[];
  hideBars?: boolean;
  showProcelScale?: boolean;
  showBaseline?: boolean;
  showTop5Line?: boolean;
  /** Which field to use for the PPp line: "min" or "max". Default: "max" */
  top5Field?: "min" | "max";
  /** Percentile threshold for the PPp line (0–1). Default: 0.05 */
  top5Percentile?: number;
  /** Show dashed curve following the max values */
  showMaxCurve?: boolean;
  /** Show dashed curve following the min values */
  showMinCurve?: boolean;
  /** Show dashed curve for Vn = (C5% - Cn) + (R5% - Rn) / 2 */
  showMidCurve?: boolean;
  /** Show project name next to the selected bar */
  showProjectName?: boolean;
  /** Custom X axis label */
  xAxisLabel?: string;
  /** Custom Y axis label */
  yAxisLabel?: string;
};
// Custom hooks
const useChartDimensions = (
  props: Pick<D3RangeChartProps, "width" | "height">,
  overrideDimensions: boolean,
  isMobile: boolean,
  isExpanded: boolean,
  hasLessValue: boolean,
  hasMoreValue: boolean,
  containerWidth: number,
  showProcelScale?: boolean,
) => {
  return useMemo(() => {
    const margin = {
      top: isExpanded ? 15 : 20,
      right: isMobile ? 0 : showProcelScale ? 40 : 20,
      bottom: isMobile ? 20 : 35,
      left: isMobile ? 45 : 80,
    };

    const width = () => {
      if (props.width && overrideDimensions) {
        // Reserve margins even when dimensions are provided by parent
        return Math.max(0, props.width - margin.left - margin.right);
      }
      if (containerWidth > 0) return containerWidth - margin.left - margin.right;
      // Return 0 when container not yet measured - will skip drawing
      return 0;
    };

    const height = () => {
      if (props.height) return props.height;
      if (isMobile && !isExpanded) return 250;
      if (isMobile && isExpanded) return 320;
      if (isExpanded) return window.innerHeight * 0.96 - 130;
      return Math.min(420, Math.max(300, window.innerHeight * 0.45));
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
    containerWidth,
    showProcelScale,
  ]);
};

const useTooltipPosition = () => {
  return useCallback(
    (
      event: MouseEvent,
      canvasRef: React.RefObject<HTMLCanvasElement | null>,
    ) => {
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
    [],
  );
};

const D3RangeChart: React.FC<D3RangeChartProps> = ({
  variant = "range",
  selectedBars = [],
  selectedMinBars,
  selectedMaxBars,
  data: rawData = [],
  overrideDimensions = false,
  unit = "",
  totalProjects,
  minData: rawMinData,
  maxData: rawMaxData,
  hideBars = false,
  showProcelScale = false,
  showBaseline = false,
  showTop5Line = false,
  top5Field = "min",
  top5Percentile = 0.05,
  showMaxCurve = false,
  showMinCurve = false,
  showMidCurve = false,
  showProjectName = false,
  xAxisLabel: xAxisLabelProp,
  yAxisLabel: yAxisLabelProp,
  ...props
}) => {
  const isCumulative = variant === "cumulative";

  // Normalize data: in cumulative mode, map `value` to both min and max
  const data = useMemo(() => {
    if (!isCumulative) return rawData;
    return rawData.map((d) => ({
      ...d,
      min: d.value ?? d.min,
      max: d.value ?? d.max,
    }));
  }, [rawData, isCumulative]);

  const minData = useMemo(
    () => rawMinData ?? data.map((d) => d.min),
    [rawMinData, data],
  );
  const maxData = useMemo(
    () => rawMaxData ?? data.map((d) => d.max),
    [rawMaxData, data],
  );
  const { isExpanded } = useSummary();
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: {
      min: number;
      max: number;
      label?: string;
      floors?: string | number;
      technology?: string[];
    };
  } | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(0);
  const [outSmallerCount, setOutSmallerCount] = useState<number>(0);
  const [outLargerCount, setOutLargerCount] = useState<number>(0);
  const outSmallerRef = useRef<number>(0);
  const outLargerRef = useRef<number>(0);
  const [hasZoomed, setHasZoomed] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const transformRef = useRef({ k: 1, x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const initialTotalRef = useRef<number>(0);
  const zoomRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(
    null,
  );
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container immediately before first paint so PROCEL scale renders correctly
  useLayoutEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.getBoundingClientRect().width;
      if (width > 0) {
        setContainerWidth(width);
      }
    }
  }, []);

  // Force redraw after initial mount when container is measured
  useEffect(() => {
    if (containerRef.current && containerWidth === 0) {
      // Retry measurement after a short delay if initial measurement failed
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const width = containerRef.current.getBoundingClientRect().width;
          if (width > 0) {
            setContainerWidth(width);
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [containerWidth]);

  const selectedBarIds = useMemo(
    () => new Set((selectedBars || []).map((id) => String(id))),
    [selectedBars],
  );
  const selectedMinBarIds = useMemo(
    () =>
      new Set((selectedMinBars ?? selectedBars ?? []).map((id) => String(id))),
    [selectedMinBars, selectedBars],
  );
  const selectedMaxBarIds = useMemo(
    () =>
      new Set((selectedMaxBars ?? selectedBars ?? []).map((id) => String(id))),
    [selectedMaxBars, selectedBars],
  );

  // Salvar o total na primeira montagem do gráfico
  useEffect(() => {
    if (data.length > 0 && initialTotalRef.current === 0) {
      initialTotalRef.current = data.length;
    }
  }, [data.length]);

  // Inicializar o contador com o total de dados filtrados
  useEffect(() => {
    setVisibleCount(selectedBarIds.size || data.length);
  }, [data.length, selectedBarIds]);

  // Função auxiliar para atualizar o contador
  const updateBrushCount = useCallback((count: number) => {
    setVisibleCount(count);
  }, []);

  const minLessDataValue = useMemo(() => Math.min(...minData), [minData]);
  const maxLessDataValue = useMemo(() => Math.max(...minData), [minData]);
  const maxMaxDataValue = useMemo(() => Math.max(...maxData), [maxData]);
  const minMaxDataValue = useMemo(() => Math.min(...maxData), [maxData]);
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
    hasMoreValue,
    containerWidth,
    showProcelScale,
  );

  // Scales and calculations
  const maxValue = useMemo(
    () =>
      (data?.map((d) => d.max).reduce((a, b) => Math.max(a, b), 0) || 170) *
      1.1,
    [data],
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

  const getTooltipPosition = useTooltipPosition();

  // Helper function to get data point under mouse
  const getDataAtPosition = useCallback(
    (mouseX: number, mouseY: number) => {
      const transform = transformRef.current;
      const newXScale = d3
        .scaleLinear()
        .domain(xScale.domain())
        .range(xScale.range().map((r) => r * transform.k + transform.x));
      const newYScale = d3
        .scaleLinear()
        .domain(yScale.domain())
        .range(yScale.range().map((r) => r * transform.k + transform.y));

      // Check if mouse is near any data point
      for (const d of data) {
        const x1 = newXScale(d.min);
        const x2 = newXScale(d.max);
        const y = newYScale(d.y);
        const baseRadius = isExpanded
          ? CHART_CONFIG.CIRCLE_RADIUS.expanded
          : CHART_CONFIG.CIRCLE_RADIUS.normal;
        const radius = baseRadius * Math.max(1, transform.k);

        // Check start circle
        const distStart = Math.sqrt(
          Math.pow(mouseX - x1, 2) + Math.pow(mouseY - y, 2),
        );
        if (distStart <= radius + 5) return d;

        // Check end circle
        const distEnd = Math.sqrt(
          Math.pow(mouseX - x2, 2) + Math.pow(mouseY - y, 2),
        );
        if (distEnd <= radius + 5) return d;

        // Check bar area (if expanded or selected)
        const minId = String(d.minId ?? d.id);
        const maxId = String(d.maxId ?? d.id);
        const showSelectionBar =
          selectedMinBarIds.has(minId) && selectedMaxBarIds.has(maxId);

        if (isExpanded || showSelectionBar) {
          const barHeight = isExpanded
            ? CHART_CONFIG.BAR_HEIGHT
            : CHART_CONFIG.MINIMAL_BAR_HEIGHT;
          if (
            mouseX >= x1 &&
            mouseX <= x2 &&
            Math.abs(mouseY - y) <= barHeight / 2
          ) {
            return d;
          }
        }
      }
      return null;
    },
    [data, xScale, yScale, isExpanded, selectedMinBarIds, selectedMaxBarIds],
  );

  // Event handlers
  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left - margin.left;
      const mouseY = event.clientY - rect.top - margin.top;

      const d = getDataAtPosition(mouseX, mouseY);

      if (d) {
        const position = getTooltipPosition(event, canvasRef);
        setTooltip({
          ...position,
          value: {
            min: d.min,
            max: d.max,
            label:
              selectedMinBarIds.has(String(d.minId ?? d.id)) ||
                selectedMaxBarIds.has(String(d.maxId ?? d.id))
                ? d.label
                : undefined,
            floors:
              selectedMinBarIds.has(String(d.minId ?? d.id)) ||
                selectedMaxBarIds.has(String(d.maxId ?? d.id))
                ? d.floors
                : undefined,
            technology:
              selectedMinBarIds.has(String(d.minId ?? d.id)) ||
                selectedMaxBarIds.has(String(d.maxId ?? d.id))
                ? d.technology
                : undefined,
          },
        });
        if (canvasRef.current) {
          canvasRef.current.style.cursor = "pointer";
        }
      } else {
        setTooltip(null);
        if (canvasRef.current) {
          canvasRef.current.style.cursor = "default";
        }
      }
    },
    [
      getDataAtPosition,
      getTooltipPosition,
      selectedMinBarIds,
      selectedMaxBarIds,
      margin,
      canvasRef,
    ],
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setTooltip(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = "default";
    }
  }, []);

  // Canvas drawing function
  const drawChart = useCallback(() => {
    if (!canvasRef.current) return;
    // Skip drawing if dimensions are not yet valid
    if (_width <= 0 || _height <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Polyfill for roundRect if not available
    if (!ctx.roundRect) {
      (ctx as any).roundRect = function (
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number | number[],
      ) {
        const r = typeof radius === "number" ? radius : radius[0];
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
    ctx.fillStyle = document.documentElement.classList.contains("dark")
      ? "#18181b"
      : "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Save context for transformations
    ctx.save();
    ctx.translate(margin.left, margin.top);

    // Create clipping region to prevent content from going outside chart area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, _width, _height);
    ctx.clip();

    // Apply zoom transform
    const transform = transformRef.current;
    const newXScale = d3
      .scaleLinear()
      .domain(xScale.domain())
      .range(xScale.range().map((r) => r * transform.k + transform.x));
    const newYScale = d3
      .scaleLinear()
      .domain(yScale.domain())
      .range(yScale.range().map((r) => r * transform.k + transform.y));
    // Keep circles at constant visual size regardless of zoom level
    const zoomRadiusFactor = 1;

    // Draw grid lines
    ctx.strokeStyle = DEFAULT_COLORS.GRID;
    ctx.lineWidth = 1;

    // Vertical grid lines
    const xTicks = newXScale.ticks(isExpanded ? 30 : 10);
    xTicks.forEach((tick) => {
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
    yTicks.forEach((tick) => {
      const y = newYScale(tick);
      if (y >= 0 && y <= _height) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(_width, y);
        ctx.stroke();
      }
    });

    // Baseline — computed here, drawn after points
    let baselineY: number | null = null;
    if (showBaseline) {
      const by = newYScale(0.5);
      if (by >= 0 && by <= _height) baselineY = by;
    }

    // Vertical line at top 5% of best projects — computed here, drawn after points
    let p5LineX: number | null = null;
    let p5LineInView = false;
    if (showTop5Line && data.length > 0) {
      const sorted = [...data].map((d) => d[top5Field]).sort((a, b) => a - b);
      const idx = Math.floor(sorted.length * top5Percentile);
      const p5Value = sorted[Math.min(idx, sorted.length - 1)];
      const lineX = newXScale(p5Value);
      p5LineX = lineX;
      p5LineInView = lineX >= 0 && lineX <= _width;
    }

    // Pre-compute mid curve regression for bar split point
    let midPredict: ((yVal: number) => number) | null = null;
    if (showMidCurve && data.length >= 3) {
      const sorted = [...data].sort((a, b) => a.y - b.y);
      const raw: [number, number][] = sorted.map((d) => [(d.min + d.max) / 2, d.y]);
      const regression = regressionPoly()
        .x((d: [number, number]) => d[1])
        .y((d: [number, number]) => d[0])
        .order(Math.min(4, raw.length - 1));
      const result = regression(raw);
      midPredict = (yVal: number) => Math.max(0, result.predict(yVal));
    }

    // First pass: Draw circles for non-selected items
    const hasActiveFilter =
      selectedMinBarIds.size > 0 || selectedMaxBarIds.size > 0;

    data.forEach((d) => {
      const x1 = newXScale(d.min);
      const x2 = newXScale(d.max);
      const y = newYScale(d.y);

      // Skip if outside visible area
      if (x2 < 0 || x1 > _width || y < 0 || y > _height) return;

      const isMinSelected = selectedMinBarIds.has(String(d.minId ?? d.id));
      const isMaxSelected = selectedMaxBarIds.has(String(d.maxId ?? d.id));

      // Draw non-selected points in first pass
      if (!isMinSelected || !isMaxSelected) {
        const baseRadius = isExpanded
          ? CHART_CONFIG.CIRCLE_RADIUS.expanded
          : CHART_CONFIG.CIRCLE_RADIUS.normal;
        const radius = baseRadius * zoomRadiusFactor;
        const strokeWidth = Math.max(
          isExpanded ? (isMobile ? 1 : 2) : 0,
          zoomRadiusFactor > 1 ? 1 : 0,
        );

        if (isCumulative) {
          // Cumulative mode: single gray circle
          const circleOpacity = hasActiveFilter ? 0.35 : 1;
          ctx.globalAlpha = circleOpacity;
          ctx.beginPath();
          ctx.arc(x1, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = DEFAULT_COLORS.GRAY_START;
          ctx.fill();
          if (strokeWidth > 0) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        } else {
          // Range mode: blue (min) and orange (max) circles
          const useGray = hideBars && hasActiveFilter;
          const circleOpacity = !hideBars && hasActiveFilter ? 0.35 : 1;
          ctx.globalAlpha = circleOpacity;

          if (!isMinSelected) {
            ctx.beginPath();
            ctx.arc(x1, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = useGray
              ? DEFAULT_COLORS.GRAY_START
              : DEFAULT_COLORS.START;
            ctx.fill();
            if (strokeWidth > 0) {
              ctx.strokeStyle = "white";
              ctx.lineWidth = strokeWidth;
              ctx.stroke();
            }
          }

          if (!isMaxSelected) {
            ctx.beginPath();
            ctx.arc(x2, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = useGray ? DEFAULT_COLORS.GRAY_END : DEFAULT_COLORS.END;
            ctx.fill();
            if (strokeWidth > 0) {
              ctx.strokeStyle = "white";
              ctx.lineWidth = isExpanded ? (isMobile ? 1 : 0.5) : 0;
              ctx.stroke();
            }
          }

          ctx.globalAlpha = 1;
        }
      }
    });

    // Second pass: Draw circles for selected items (on top)
    data.forEach((d) => {
      const x1 = newXScale(d.min);
      const x2 = newXScale(d.max);
      const y = newYScale(d.y);

      // Skip if outside visible area
      if (x2 < 0 || x1 > _width || y < 0 || y > _height) return;

      const isMinSelected = selectedMinBarIds.has(String(d.minId ?? d.id));
      const isMaxSelected = selectedMaxBarIds.has(String(d.maxId ?? d.id));
      const isPairSelected = isMinSelected && isMaxSelected;

      if (isMinSelected || isMaxSelected) {
        const barHeight = isExpanded
          ? CHART_CONFIG.BAR_HEIGHT
          : CHART_CONFIG.MINIMAL_BAR_HEIGHT;
        const barY = y - barHeight / 2;
        const barWidth = Math.max(1, x2 - x1);

        if (isCumulative) {
          // Cumulative mode: single gray circle (darker for selected)
          const baseRadius = isExpanded
            ? CHART_CONFIG.CIRCLE_RADIUS.expanded
            : CHART_CONFIG.CIRCLE_RADIUS.normal;
          const radius = baseRadius * zoomRadiusFactor;
          const strokeWidth = Math.max(
            isExpanded ? (isMobile ? 1 : 2) : 0,
            zoomRadiusFactor > 1 ? 1 : 0,
          );

          ctx.beginPath();
          ctx.arc(x1, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = DEFAULT_COLORS.GRAY_END;
          ctx.fill();
        } else {
          // Range mode: bars and colored circles
          // Bar connecting min and max only when both endpoints are selected
          // Split bar: blue from min to mid, orange from mid to max
          if (!hideBars && isPairSelected) {
            // Use midPredict regression if available, otherwise use simple average
            const midValue = midPredict ? midPredict(d.y) : (d.min + d.max) / 2;
            const xMid = newXScale(midValue);
            const rr = isExpanded ? barHeight / 2 : 2;

            // Blue half: min → mid
            ctx.fillStyle = DEFAULT_COLORS.START;
            ctx.beginPath();
            (ctx as any).roundRect(
              x1,
              barY,
              Math.max(1, xMid - x1),
              barHeight,
              { upperLeft: rr, lowerLeft: rr, upperRight: 0, lowerRight: 0 },
            );
            ctx.fill();

            // Orange half: mid → max
            ctx.fillStyle = DEFAULT_COLORS.END;
            ctx.beginPath();
            (ctx as any).roundRect(
              xMid,
              barY,
              Math.max(1, x2 - xMid),
              barHeight,
              { upperLeft: 0, lowerLeft: 0, upperRight: rr, lowerRight: rr },
            );
            ctx.fill();
          }

          const baseRadius = isExpanded
            ? CHART_CONFIG.CIRCLE_RADIUS.expanded
            : CHART_CONFIG.CIRCLE_RADIUS.normal;
          const radius = baseRadius * zoomRadiusFactor;
          const strokeWidth = Math.max(
            isExpanded ? (isMobile ? 1 : 2) : 0,
            zoomRadiusFactor > 1 ? 1 : 0,
          );

          if (isMinSelected) {
            ctx.beginPath();
            ctx.arc(x1, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = DEFAULT_COLORS.START;
            ctx.fill();
          }

          if (isMaxSelected) {
            ctx.beginPath();
            ctx.arc(x2, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = DEFAULT_COLORS.END;
            ctx.fill();
          }
        }

        // Arrow between PPp 5% line and x1 (min/C) for projects worse than top 5%
        if (
          !hideBars &&
          !isCumulative &&
          isPairSelected &&
          p5LineX !== null &&
          x1 > p5LineX + (isExpanded
            ? CHART_CONFIG.CIRCLE_RADIUS.expanded
            : CHART_CONFIG.CIRCLE_RADIUS.normal) * zoomRadiusFactor * 2
        ) {
          const baseRadius = isExpanded
            ? CHART_CONFIG.CIRCLE_RADIUS.expanded
            : CHART_CONFIG.CIRCLE_RADIUS.normal;
          const radius = baseRadius * zoomRadiusFactor;
          const arrowY = y;
          const arrowLeft = p5LineX + 2;
          const arrowRight = x1 - radius;
          const headSize = isExpanded ? 6 : 4;

          ctx.save();
          ctx.strokeStyle = "#7B2D8E";
          ctx.fillStyle = "#7B2D8E";
          ctx.lineWidth = 1.5;

          // Horizontal line
          ctx.beginPath();
          ctx.moveTo(arrowLeft, arrowY);
          ctx.lineTo(arrowRight, arrowY);
          ctx.stroke();

          // Left arrowhead (pointing left)
          ctx.beginPath();
          ctx.moveTo(arrowLeft, arrowY);
          ctx.lineTo(arrowLeft + headSize, arrowY - headSize / 2);
          ctx.lineTo(arrowLeft + headSize, arrowY + headSize / 2);
          ctx.closePath();
          ctx.fill();

          // Right arrowhead (pointing right)
          ctx.beginPath();
          ctx.moveTo(arrowRight, arrowY);
          ctx.lineTo(arrowRight - headSize, arrowY - headSize / 2);
          ctx.lineTo(arrowRight - headSize, arrowY + headSize / 2);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }
      }
    });

    // Draw project names for selected bars
    if (showProjectName) {
      data.forEach((d) => {
        const isMinSelected = selectedMinBarIds.has(String(d.minId ?? d.id));
        const isMaxSelected = selectedMaxBarIds.has(String(d.maxId ?? d.id));
        const isPairSelected = isMinSelected && isMaxSelected;
        
        if (isPairSelected && d.label) {
          const x1 = newXScale(d.min);
          const x2 = newXScale(d.max);
          const y = newYScale(d.y);
          
          // Skip if outside visible area
          if (x2 < 0 || x1 > _width || y < 0 || y > _height) return;
          
          // Position text to the right of the max point
          const textX = x2 + 10;
          const textY = y;
          
          ctx.save();
          ctx.font = isExpanded ? "12px sans-serif" : "10px sans-serif";
          ctx.fillStyle = "#111827";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          
          // Add a semi-transparent background for better readability
          const textMetrics = ctx.measureText(d.label);
          const textWidth = textMetrics.width;
          const textHeight = isExpanded ? 16 : 14;
          const padding = 4;
          
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.fillRect(
            textX - padding,
            textY - textHeight / 2,
            textWidth + padding * 2,
            textHeight
          );
          
          // Draw the text
          ctx.fillStyle = "#111827";
          ctx.fillText(d.label, textX, textY);
          ctx.restore();
        }
      });
    }

    // Draw baseline on top of all points
    if (baselineY !== null) {
      ctx.save();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(_width, baselineY);
      ctx.stroke();
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(t.benchmark.chartTypes.cumulativeFraction.baseLine, 4, baselineY - 3);
      ctx.restore();
    }

    // Draw 5% line on top of all points
    if (p5LineX !== null && p5LineInView) {
      ctx.save();
      ctx.strokeStyle = "#00A650";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(p5LineX, 0);
      ctx.lineTo(p5LineX, _height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#00A650";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("5%", p5LineX + 4, 4);
      ctx.restore();
    }

    // Dashed curves (min / mid / max) — polynomial regression trend lines
    if (showMaxCurve || showMinCurve || showMidCurve) {
      const sorted = [...data].sort((a, b) => a.y - b.y);

      const buildTrendPoints = (
        rawData: [number, number][],
        steps = 80,
        clampZero = true,
      ): { x: number; y: number }[] => {
        if (rawData.length < 3) return rawData.map(([x, y]) => ({ x: newXScale(x), y: newYScale(y) }));
        const regression = regressionPoly()
          .x((d: [number, number]) => d[1])
          .y((d: [number, number]) => d[0])
          .order(Math.min(4, rawData.length - 1));
        const result = regression(rawData);
        const predict = result.predict;
        const yMin = Math.min(...rawData.map((d) => d[1]));
        const yMax = Math.max(...rawData.map((d) => d[1]));
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i <= steps; i++) {
          const yVal = yMin + (yMax - yMin) * (i / steps);
          const xVal = clampZero ? Math.max(0, predict(yVal)) : predict(yVal);
          pts.push({ x: newXScale(xVal), y: newYScale(yVal) });
        }
        return pts;
      };

      const drawTrendCurve = (points: { x: number; y: number }[]) => {
        if (points.length < 2) return;
        ctx.save();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 0.75;
        ctx.setLineDash([1, 3]);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      };

      if (showMaxCurve) {
        const raw: [number, number][] = sorted.map((d) => [d.max, d.y]);
        drawTrendCurve(buildTrendPoints(raw));
      }

      if (showMinCurve) {
        const raw: [number, number][] = sorted.map((d) => [d.min, d.y]);
        drawTrendCurve(buildTrendPoints(raw));
      }

      if (showMidCurve) {
        const raw: [number, number][] = sorted.map((d) => [(d.min + d.max) / 2, d.y]);
        drawTrendCurve(buildTrendPoints(raw));
      }
    }

    // Restore clipping region
    ctx.restore();

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
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const xAxisTicks = newXScale.ticks(Math.min(10, Math.floor(_width / 60)));
    xAxisTicks.forEach((tick) => {
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
    ctx.textAlign = "end";
    ctx.textBaseline = "middle";

    const yAxisTicks = newYScale.ticks(8);
    yAxisTicks.forEach((tick) => {
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

    // PROCEL color scale on the right side — zoom-aware
    if (showProcelScale && !isMobile) {
      const barX = _width;
      const barWidth = PROCEL_SCALE_CONFIG.WIDTH;
      const procelClasses = isCumulative ? PROCEL_CLASSES_5 : PROCEL_CLASSES;
      const bandSize = 1.0 / procelClasses.length;

      ctx.save();
      // Clip to chart height so bands don't overflow vertically
      ctx.beginPath();
      ctx.rect(barX, 0, barWidth + 5, _height);
      ctx.clip();

      const reversed = [...procelClasses].reverse();
      reversed.forEach((cls, i) => {
        const domainTop = 1.0 - i * bandSize;
        const domainBottom = 1.0 - (i + 1) * bandSize;
        const bandTop = Math.max(0, newYScale(domainTop));
        const bandBottom = Math.min(_height, newYScale(domainBottom));
        if (bandBottom <= bandTop) return; // band outside view

        ctx.fillStyle = cls.color;
        ctx.fillRect(barX, bandTop, barWidth, Math.ceil(bandBottom - bandTop));

        // Class label centered in the visible portion of the band
        ctx.fillStyle = "#111827";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cls.label, barX + barWidth / 2, (bandTop + bandBottom) / 2);
      });

      ctx.restore();
    }

    ctx.restore();

    // Count items by pixel position — same criteria as the renderer skip conditions.
    // "smaller" = left of view (lower X) or below view (lower cumulative fraction = best buildings)
    // "larger"  = right of view (higher X) or above view (higher cumulative fraction = worst buildings)
    let _countInView = 0;
    let _countSmaller = 0;
    let _countLarger = 0;
    const hasSelection = selectedMinBarIds.size > 0 || selectedMaxBarIds.size > 0;
    const _countSource = hasSelection
      ? data.filter((d) =>
          selectedMinBarIds.has(String(d.minId ?? d.id)) &&
          selectedMaxBarIds.has(String(d.maxId ?? d.id)),
        )
      : data;
    for (const d of _countSource) {
      const px1 = newXScale(d.min);
      const px2 = newXScale(d.max);
      const py  = newYScale(d.y);
      if (px2 < 0)       { _countSmaller++; continue; } // left  = smaller X
      if (px1 > _width)  { _countLarger++;  continue; } // right = larger X
      if (py  > _height) { _countSmaller++; continue; } // below = lower cumulative
      if (py  < 0)       { _countLarger++;  continue; } // above = higher cumulative
      _countInView++;
    }
    updateBrushCount(_countInView);
    if (outSmallerRef.current !== _countSmaller) {
      outSmallerRef.current = _countSmaller;
      setOutSmallerCount(_countSmaller);
    }
    if (outLargerRef.current !== _countLarger) {
      outLargerRef.current = _countLarger;
      setOutLargerCount(_countLarger);
    }
  }, [
    canvasRef,
    margin,
    xScale,
    yScale,
    _width,
    _height,
    data,
    selectedMinBarIds,
    selectedMaxBarIds,
    isExpanded,
    isMobile,
    isCumulative,
    maxValue,
    hideBars,
    showProcelScale,
    showBaseline,
    showTop5Line,
    showMaxCurve,
    showMinCurve,
    showMidCurve,
    showProjectName,
    updateBrushCount,
  ]);

  // Resize handler
  const debouncedResizeRef = useMemo(
    () =>
      debounce(() => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(drawChart);
      }, 50),
    [drawChart],
  );

  useEffect(() => {
    window.addEventListener("resize", debouncedResizeRef);
    return () => window.removeEventListener("resize", debouncedResizeRef);
  }, [debouncedResizeRef]);

  // ResizeObserver to watch parent element changes
  useEffect(() => {
    if (!containerRef.current) return;

    // Initial measurement
    setContainerWidth(containerRef.current.getBoundingClientRect().width);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
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

    // Initial draw with a small delay to ensure container is measured
    const initialDrawTimer = setTimeout(() => {
      drawChart();
    }, 10);

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
        if (!zoomEnabled) return false;
        return !event.button && event.type !== "dblclick";
      })
      .on("zoom", (event) => {
        const t = event.transform;
        // Clamp X: tx ≤ 0 (no empty left), tx ≥ _width*(1 - 1.1*k) (no empty right)
        const tx = Math.min(0, Math.max(t.x, _width * (1 - 1.1 * t.k)));
        // Clamp Y (inverted scale): ty ≤ 0 (no empty above), ty ≥ _height*(1-k) (no empty below)
        const ty = Math.min(0, Math.max(t.y, _height * (1 - t.k)));

        transformRef.current = { k: t.k, x: tx, y: ty };

        // Check if zoomed
        const isZoomed = t.k !== 1 || tx !== 0 || ty !== 0;
        setHasZoomed(isZoomed);

        // Redraw with animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(drawChart);
      });

    zoomRef.current = zoom;

    // Apply zoom to canvas
    d3.select(canvas).call(zoom as any);

    // Double click to reset zoom
    const handleDoubleClick = () => {
      d3.select(canvas)
        .transition()
        .duration(750)
        .call(zoom.transform as any, d3.zoomIdentity);

      transformRef.current = { k: 1, x: 0, y: 0 };
      updateBrushCount(selectedBarIds.size || data.length);
      setHasZoomed(false);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(drawChart);
    };

    canvas.addEventListener("dblclick", handleDoubleClick);
    canvas.addEventListener("mousemove", handleCanvasMouseMove as any);
    canvas.addEventListener("mouseleave", handleCanvasMouseLeave);

    // Cleanup
    return () => {
      clearTimeout(initialDrawTimer);
      canvas.removeEventListener("dblclick", handleDoubleClick);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove as any);
      canvas.removeEventListener("mouseleave", handleCanvasMouseLeave);
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
    zoomEnabled,
  ]);

  // Reset zoom when disabling
  useEffect(() => {
    if (!zoomEnabled && canvasRef.current && zoomRef.current) {
      d3.select(canvasRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.transform as any, d3.zoomIdentity);

      transformRef.current = { k: 1, x: 0, y: 0 };
      updateBrushCount(selectedBarIds.size || data.length);
      setHasZoomed(false);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(drawChart);
    }
  }, [zoomEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw when selectedBars changes
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(drawChart);
  }, [selectedBars, selectedMinBars, selectedMaxBars, drawChart]);

  // Redraw when container dimensions or showProcelScale changes
  useEffect(() => {
    if (containerWidth > 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(drawChart);
    }
  }, [containerWidth, showProcelScale, drawChart]);

  const labelX = xAxisLabelProp ??
    (UNIT_LABELS[unit as keyof typeof UNIT_LABELS] || t.benchmark.chartTypes.cumulativeFraction.xAxisLabelCarbon);
  const labelY = yAxisLabelProp ?? t.benchmark.chartTypes.cumulativeFraction.yAxisLabel;
  const displayedCount = hasZoomed ? visibleCount : data.length;
  const totalCount = Math.max(totalProjects || 0, initialTotalRef.current || 0, data.length);
  const selectedCount = new Set([...selectedMinBarIds, ...selectedMaxBarIds]).size;

  return (
    <Card className={cn("shadow-none w-min-content min-w-1/2")}>
      <CardContent>
        <div ref={containerRef} className="w-full overflow-hidden relative">
          <span className="absolute text-xs w-full text-center text-foreground/70 block rotate-270 left-0 -translate-x-[47%] -translate-y-1/2 top-1/2 h-8 m-0 p-0">
            {labelY}
          </span>

          <Indicators
            max={maxMaxDataValue}
            min={maxLessDataValue}
            hasZoomed={hasZoomed}
            position="end"
            countLarger={outLargerCount}
            countSmaller={outSmallerCount}
          />

          <button
            type="button"
            onClick={() => setZoomEnabled((prev) => !prev)}
            className={cn(
              "absolute top-2 left-2 z-10 p-1.5 rounded-md border text-xs flex items-center gap-1 transition-colors",
              zoomEnabled
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                : "bg-background text-muted-foreground border-border hover:bg-muted",
            )}
            title={zoomEnabled ? "Desabilitar zoom" : "Habilitar zoom"}
          >
            {zoomEnabled ? (
              <Search className="size-3.5" />
            ) : (
              <SearchX className="size-3.5" />
            )}
            <span className="max-sm:hidden">Zoom</span>
          </button>

          <canvas
            ref={canvasRef}
            className={cn(
              "bg-white dark:bg-zinc-900 w-full",
              zoomEnabled
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-default",
            )}
            style={{
              width: "100%",
              height: _height + margin.top + margin.bottom,
            }}
          />

          {!isMobile && (
            <Indicators
              max={minMaxDataValue}
              min={minLessDataValue}
              hasZoomed={hasZoomed}
              position="start"
              countLarger={outLargerCount}
              countSmaller={outSmallerCount}
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
              {isCumulative ? (
                <span>
                  {t.benchmark.chartTypes.cumulativeFraction.xAxisLabelCarbon}:{" "}
                  <b>
                    {tooltip.value.min.toInternational()} {unit}
                  </b>
                </span>
              ) : (
                <>
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
                </>
              )}
              {tooltip.value.floors !== undefined && tooltip.value.floors !== null && (
                <span>
                  {t.d3chart.floors}: <b>{tooltip.value.floors}</b>
                </span>
              )}
              {!!tooltip.value.technology?.length && (
                <span>
                  {t.d3chart.technology}:{" "}
                  <b>
                    {tooltip.value.technology
                      .map((t) => structureTypes[t as keyof typeof structureTypes] || t)
                      .join(", ")}
                  </b>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex max-sm:flex-col-reverse max-sm:gap-4 max-sm:mt-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs">
              {t.d3chart.displaying}: {displayedCount} {t.d3chart.of} {totalCount}
            </span>
            {selectedCount > 0 && (
              <span className="text-xs text-foreground/60">
                {t.d3chart.selected}: {selectedCount} {t.d3chart.of} {data.length}
              </span>
            )}
          </div>
          {isMobile && (
            <Indicators
              max={minMaxDataValue}
              min={minLessDataValue}
              hasZoomed={hasZoomed}
              position="start"
              countLarger={outLargerCount}
              countSmaller={outSmallerCount}
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

export default D3RangeChart;

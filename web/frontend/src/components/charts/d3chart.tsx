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
  START: "#5B9BD5",
  END: "#E0756C",
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
] as const;

type ProcelLabel = (typeof PROCEL_CLASSES_5)[number]["label"];

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

  // PROCEL Scale 
  showProcelScale?: boolean;
  procelHighlight?: ProcelLabel | null;
  procelFadedOpacity?: number;

  showBaseline?: boolean;
  showTop5Line?: boolean;
  top5Field?: "min" | "max";
  top5Percentile?: number;
  showMaxCurve?: boolean;
  showMinCurve?: boolean;
  showMidCurve?: boolean;
  showProjectName?: boolean;
  xAxisLabel?: string;
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
  containerHeight?: number,
) => {
  return useMemo(() => {
    // Margens otimizadas para ocupar o máximo de espaço
    const margin = {
      top: 14,
      right: isMobile ? 5 : showProcelScale ? 35 : 15,
      bottom: 25,
      left: isMobile ? 35 : 45, // Reduzido de 80 para 45
    };

    const width = () => {
      if (props.width && overrideDimensions) {
        return Math.max(0, props.width - margin.left - margin.right);
      }
      if (containerWidth > 0) return containerWidth - margin.left - margin.right;
      return 0;
    };

    const height = () => {
      if (props.height) return props.height;
      if (isMobile && !isExpanded) return 250;
      if (isMobile && isExpanded) return 320;
      if (isExpanded) return window.innerHeight * 0.96 - 130;
      return Math.min(window.innerHeight > 1080 ? 500 : window.innerHeight <= 768 ? 230 : 370, Math.max(300, window.innerHeight * 0.45));
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
    containerHeight,
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
  procelHighlight = null,
  procelFadedOpacity = 0.25,
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

  // Custom transform reference mantendo X e Y independentes
  const transformRef = useRef({ kx: 1, ky: 1, x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const initialTotalRef = useRef<number>(0);

  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useLayoutEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.getBoundingClientRect().width;
      if (width > 0) {
        setContainerWidth(width);
      }
    }
  }, []);

  useEffect(() => {
    if (containerRef.current && containerWidth === 0) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const width = containerRef.current.getBoundingClientRect().width;
          const height = containerRef.current.getBoundingClientRect().height;
          if (width > 0) {
            setContainerWidth(width);
          }
          if (height > 0) {
            setContainerHeight(height);
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

  useEffect(() => {
    if (data.length > 0 && initialTotalRef.current === 0) {
      initialTotalRef.current = data.length;
    }
  }, [data.length]);

  useEffect(() => {
    setVisibleCount(selectedBarIds.size || data.length);
  }, [data.length, selectedBarIds]);

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
    containerHeight
  );

  const maxValue = useMemo(
    () =>
      (data?.map((d) => d.max).reduce((a, b) => Math.max(a, b), 0) || 170) *
      1.1,
    [data],
  );

  const xScale = useMemo(() => {
    const width = _width > 0 ? _width : 400;
    return d3
      .scaleLinear()
      .domain([0, maxValue * 1.15])
      .range([0, width * 1.1]);
  }, [maxValue, _width]);

  const yScale = useMemo(() => {
    return d3.scaleLinear().domain([0, 1.01]).range([_height, 0]);
  }, [_height]);

  const getTooltipPosition = useTooltipPosition();

  const getDataAtPosition = useCallback(
    (mouseX: number, mouseY: number) => {
      const transform = transformRef.current;
      const newXScale = d3
        .scaleLinear()
        .domain(xScale.domain())
        .range(xScale.range().map((r) => r * transform.kx + transform.x));
      const newYScale = d3
        .scaleLinear()
        .domain(yScale.domain())
        .range(yScale.range().map((r) => r * transform.ky + transform.y));

      for (const d of data) {
        const x1 = newXScale(d.min);
        const x2 = newXScale(d.max);
        const y = newYScale(d.y);
        const baseRadius = isExpanded
          ? CHART_CONFIG.CIRCLE_RADIUS.expanded
          : CHART_CONFIG.CIRCLE_RADIUS.normal;
        const radius = baseRadius * Math.max(1, transform.kx); // Utilizando kx como base para expansão visual da hit area

        const distStart = Math.sqrt(
          Math.pow(mouseX - x1, 2) + Math.pow(mouseY - y, 2),
        );
        if (distStart <= radius + 5) return d;

        const distEnd = Math.sqrt(
          Math.pow(mouseX - x2, 2) + Math.pow(mouseY - y, 2),
        );
        if (distEnd <= radius + 5) return d;

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
          canvasRef.current.style.cursor = zoomEnabled ? "grab" : "default";
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
      zoomEnabled
    ],
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setTooltip(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = zoomEnabled ? "grab" : "default";
    }
  }, [zoomEnabled]);

  const drawChart = useCallback(() => {
    if (!canvasRef.current) return;
    if (_width <= 0 || _height <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

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

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = document.documentElement.classList.contains("dark")
      ? "#18181b"
      : "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(margin.left, margin.top);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, _width, _height);
    ctx.clip();

    const transform = transformRef.current;
    const newXScale = d3
      .scaleLinear()
      .domain(xScale.domain())
      .range(xScale.range().map((r) => r * transform.kx + transform.x));
    const newYScale = d3
      .scaleLinear()
      .domain(yScale.domain())
      .range(yScale.range().map((r) => r * transform.ky + transform.y));
    const zoomRadiusFactor = 1;

    ctx.strokeStyle = DEFAULT_COLORS.GRID;
    ctx.lineWidth = 1;

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

    let baselineY: number | null = null;
    if (showBaseline) {
      const by = newYScale(0.5);
      if (by >= 0 && by <= _height) baselineY = by;
    }

    // PPp 5% line & C/R calculations
    let p5LineX: number | null = null;
    let p5LineInView = false;
    let c5Value: number | null = null;
    let r5Value: number | null = null;
    if (showTop5Line && data.length > 0) {
      const sortedMin = [...data].map((d) => d.min).sort((a, b) => a - b);
      const idx = Math.floor(sortedMin.length * top5Percentile);
      c5Value = sortedMin[Math.min(idx, sortedMin.length - 1)];

      const sortedMax = [...data].map((d) => d.max).sort((a, b) => a - b);
      r5Value = sortedMax[Math.min(idx, sortedMax.length - 1)];

      const p5Value = top5Field === "min" ? c5Value : r5Value;
      const lineX = newXScale(p5Value);
      p5LineX = lineX;
      p5LineInView = lineX >= 0 && lineX <= _width;
    }

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

    const hasActiveFilter =
      selectedMinBarIds.size > 0 || selectedMaxBarIds.size > 0;

    data.forEach((d) => {
      const x1 = newXScale(d.min);
      const x2 = newXScale(d.max);
      const y = newYScale(d.y);

      if (x2 < 0 || x1 > _width || y < 0 || y > _height) return;

      const isMinSelected = selectedMinBarIds.has(String(d.minId ?? d.id));
      const isMaxSelected = selectedMaxBarIds.has(String(d.maxId ?? d.id));

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

    const selectedAnnotations: {
      x1: number;
      x2: number;
      xMid: number;
      y: number;
      barHeight: number;
    }[] = [];

    data.forEach((d) => {
      const x1 = newXScale(d.min);
      const x2 = newXScale(d.max);
      const y = newYScale(d.y);

      if (x2 < 0 || x1 > _width || y < 0 || y > _height) return;

      const isMinSelected = selectedMinBarIds.has(String(d.minId ?? d.id));
      const isMaxSelected = selectedMaxBarIds.has(String(d.maxId ?? d.id));
      const isPairSelected = isMinSelected && isMaxSelected;

      if (isMinSelected || isMaxSelected) {
        const barHeight = isExpanded
          ? CHART_CONFIG.BAR_HEIGHT
          : CHART_CONFIG.MINIMAL_BAR_HEIGHT;
        const barY = y - barHeight / 2;

        if (isCumulative) {
          const baseRadius = isExpanded
            ? CHART_CONFIG.CIRCLE_RADIUS.expanded
            : CHART_CONFIG.CIRCLE_RADIUS.normal;
          const radius = baseRadius * zoomRadiusFactor;

          ctx.beginPath();
          ctx.arc(x1, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = DEFAULT_COLORS.GRAY_END;
          ctx.fill();
        } else {
          if (!hideBars && isPairSelected) {
            const midValue = midPredict ? midPredict(d.y) : (d.min + d.max) / 2;
            const xMid = newXScale(midValue);
            const rr = isExpanded ? barHeight / 2 : 2;

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

          if (isPairSelected) {
            let midValue: number;
            if (c5Value !== null && r5Value !== null) {
              midValue = (c5Value - d.min) + (r5Value - d.max) / 2;
              if (midValue < 0) midValue = (d.min + d.max) / 2;
            } else {
              midValue = (d.min + d.max) / 2;
            }
            const xMid = newXScale(midValue);

            selectedAnnotations.push({
              x1,
              x2,
              xMid,
              y,
              barHeight,
            });
          }
        }
      }
    });

    if (showProjectName) {
      data.forEach((d) => {
        const isMinSelected = selectedMinBarIds.has(String(d.minId ?? d.id));
        const isMaxSelected = selectedMaxBarIds.has(String(d.maxId ?? d.id));
        const isPairSelected = isMinSelected && isMaxSelected;

        if (isPairSelected && d.label) {
          const x1 = newXScale(d.min);
          const x2 = newXScale(d.max);
          const y = newYScale(d.y);

          if (x2 < 0 || x1 > _width || y < 0 || y > _height) return;

          const textX = x2 + 10;
          const textY = y;

          ctx.save();
          ctx.font = isExpanded ? "12px sans-serif" : "10px sans-serif";
          ctx.fillStyle = "#111827";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";

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

          ctx.fillStyle = "#111827";
          ctx.fillText(d.label, textX, textY);
          ctx.restore();
        }
      });
    }

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

    if (showMaxCurve || showMinCurve || showMidCurve) {
      const sorted = [...data].sort((a, b) => a.y - b.y);

      const buildTrendPoints = (
        rawData: [number, number][],
        steps = 80,
        clampZero = true,
      ): { x: number; y: number; }[] => {
        if (rawData.length < 3) return rawData.map(([x, y]) => ({ x: newXScale(x), y: newYScale(y) }));
        const regression = regressionPoly()
          .x((d: [number, number]) => d[1])
          .y((d: [number, number]) => d[0])
          .order(Math.min(4, rawData.length - 1));
        const result = regression(rawData);
        const predict = result.predict;
        const yMin = Math.min(...rawData.map((d) => d[1]));
        const yMax = Math.max(...rawData.map((d) => d[1]));
        const pts: { x: number; y: number; }[] = [];
        for (let i = 0; i <= steps; i++) {
          const yVal = yMin + (yMax - yMin) * (i / steps);
          const xVal = clampZero ? Math.max(0, predict(yVal)) : predict(yVal);
          pts.push({ x: newXScale(xVal), y: newYScale(yVal) });
        }
        return pts;
      };

      const drawTrendCurve = (points: { x: number; y: number; }[]) => {
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

    ctx.restore();

    if (selectedAnnotations.length > 0 && !isCumulative && !hideBars) {
      selectedAnnotations.forEach(({ x1, x2, xMid, y, barHeight }) => {
        const labelR = 6;
        const labelY = y - barHeight / 2 - labelR - 2;

        ctx.save();
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillStyle = DEFAULT_COLORS.START;
        ctx.beginPath();
        ctx.arc(x1, labelY, labelR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText("C", x1, labelY);

        ctx.fillStyle = "#63B332";
        ctx.beginPath();
        ctx.arc(xMid, labelY, labelR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText("V", xMid, labelY);

        ctx.fillStyle = DEFAULT_COLORS.END;
        ctx.beginPath();
        ctx.arc(x2, labelY, labelR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText("R", x2, labelY);

        if (p5LineX !== null && Math.abs(p5LineX - x1) > labelR) {
          const arrowLeft = Math.min(x1, p5LineX);
          const arrowRight = Math.max(x1, p5LineX);
          const headSize = 4;

          ctx.strokeStyle = "#7B2D8E";
          ctx.fillStyle = "#7B2D8E";
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.moveTo(arrowLeft, y);
          ctx.lineTo(arrowRight, y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(arrowLeft, y);
          ctx.lineTo(arrowLeft + headSize, y - headSize / 2);
          ctx.lineTo(arrowLeft + headSize, y + headSize / 2);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(arrowRight, y);
          ctx.lineTo(arrowRight - headSize, y - headSize / 2);
          ctx.lineTo(arrowRight - headSize, y + headSize / 2);
          ctx.closePath();
          ctx.fill();

          const arrowMidX = (arrowLeft + arrowRight) / 2;
          ctx.fillStyle = "#7B2D8E";
          ctx.beginPath();
          ctx.arc(arrowMidX, y, labelR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.fillText("P", arrowMidX, y);
        }
        ctx.restore();
      });
    }

    ctx.restore();

    ctx.save();
    ctx.translate(margin.left, margin.top);

    ctx.strokeStyle = DEFAULT_COLORS.TEXT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, _height);
    ctx.lineTo(_width, _height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, _height);
    ctx.stroke();

    ctx.fillStyle = DEFAULT_COLORS.TEXT;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const xAxisTicks = newXScale.ticks(Math.min(10, Math.floor(_width / 60)));
    xAxisTicks.forEach((tick) => {
      const x = newXScale(tick);
      if (x >= 0 && x <= _width) {
        ctx.beginPath();
        ctx.moveTo(x, _height);
        ctx.lineTo(x, _height + 6);
        ctx.stroke();
        ctx.fillText((tick as number).toInternational(), x, _height + 8);
      }
    });

    ctx.textAlign = "end";
    ctx.textBaseline = "middle";

    const yAxisTicks = newYScale.ticks(8);
    yAxisTicks.forEach((tick) => {
      const y = newYScale(tick);
      if (y >= 0 && y <= _height) {
        ctx.beginPath();
        ctx.moveTo(-6, y);
        ctx.lineTo(0, y);
        ctx.stroke();
        ctx.fillText((tick as number).toInternational(), -10, y);
      }
    });

    if (showProcelScale && !isMobile) {
      const barX = _width;
      const barWidth = PROCEL_SCALE_CONFIG.WIDTH;
      const procelClasses = isCumulative ? PROCEL_CLASSES_5 : PROCEL_CLASSES;
      const bandSize = 1.0 / procelClasses.length;

      ctx.save();
      ctx.beginPath();
      ctx.rect(barX, 0, barWidth + 5, _height);
      ctx.clip();

      const reversed = [...procelClasses].reverse();
      reversed.forEach((cls, i) => {
        const domainTop = 1.0 - i * bandSize;
        const domainBottom = 1.0 - (i + 1) * bandSize;
        const bandTop = Math.max(0, newYScale(domainTop));
        const bandBottom = Math.min(_height, newYScale(domainBottom));
        if (bandBottom <= bandTop) return;

        const isHighlighted = procelHighlight == null || cls.label === procelHighlight;
        ctx.globalAlpha = isHighlighted ? 1 : procelFadedOpacity;

        ctx.fillStyle = cls.color;
        ctx.fillRect(barX, bandTop, barWidth, Math.ceil(bandBottom - bandTop));

        ctx.globalAlpha = 1;
        ctx.fillStyle = "#111827";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cls.label, barX + barWidth / 2, (bandTop + bandBottom) / 2);
      });

      ctx.restore();
    }

    ctx.restore();

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
      
      // Se o final da barra está antes do ponto 0 no Eixo X (está à esquerda)
      if (px2 < 0) { 
        _countSmaller++; 
        continue; 
      }
      
      // Se o início da barra está depois do limite no Eixo X (está à direita)
      if (px1 > _width) { 
        _countLarger++;  
        continue; 
      } 
      
      // Se estiver fora do limite vertical (Eixo Y), ignoramos da view. 
      // Não somamos nem no Smaller, nem no Larger.
      if (py > _height || py < 0) { 
        continue; 
      }
      
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
    procelHighlight,
    procelFadedOpacity,
    showBaseline,
    showTop5Line,
    showMaxCurve,
    showMinCurve,
    showMidCurve,
    showProjectName,
    updateBrushCount,
  ]);

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

  useEffect(() => {
    if (!containerRef.current) return;

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

  // Hook unificado para instanciar zoom manual & d3.drag para panning
  useEffect(() => {
    if (!canvasRef.current) return;
    const initialDrawTimer = setTimeout(() => drawChart(), 10);
    const canvas = canvasRef.current;

    // Configurando d3.drag unicamente para Panning
    const drag = d3.drag<HTMLCanvasElement, unknown>()
      .filter((event) => {
        if (!zoomEnabled) return false;
        return !event.button; // Apenas clique esquerdo
      })
      .on("drag", (event) => {
        const tr = transformRef.current;
        let tx = tr.x + event.dx;
        let ty = tr.y + event.dy;

        // Clamping (Mesma lógica interna do D3 extentTranslate)
        tx = Math.min(0, Math.max(tx, _width * (1 - 1.1 * tr.kx)));
        ty = Math.min(0, Math.max(ty, _height * (1 - tr.ky)));

        transformRef.current = { ...tr, x: tx, y: ty };
        setHasZoomed(tr.kx !== 1 || tr.ky !== 1 || tx !== 0 || ty !== 0);

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(drawChart);
      });

    d3.select(canvas).call(drag as any);

    const handleWheel = (e: WheelEvent) => {
      if (!zoomEnabled) return;
      e.preventDefault();
      e.stopPropagation(); // Previne conflitos

      const sensitivity = e.shiftKey || e.ctrlKey ? 250 : 700;
      const zoomFactor = Math.exp(-e.deltaY / sensitivity);

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - margin.left;
      const my = e.clientY - rect.top - margin.top;

      const tr = transformRef.current;
      let { kx, ky, x: tx, y: ty } = tr;
      const oldKx = kx, oldKy = ky;

      if (e.ctrlKey && !e.shiftKey) {
        // Zoom apenas em Y
        ky = Math.max(1, Math.min(10, ky * zoomFactor));
      } else if (e.shiftKey && !e.ctrlKey) {
        // Zoom apenas em X
        kx = Math.max(1, Math.min(10, kx * zoomFactor));
      } else {
        // Zoom em ambos (comportamento padrão)
        kx = Math.max(1, Math.min(10, kx * zoomFactor));
        ky = Math.max(1, Math.min(10, ky * zoomFactor));
      }

      // Translada para manter o mouse na mesma posição durante o Zoom
      tx = mx - (mx - tx) * (kx / oldKx);
      ty = my - (my - ty) * (ky / oldKy);

      tx = Math.min(0, Math.max(tx, _width * (1 - 1.1 * kx)));
      ty = Math.min(0, Math.max(ty, _height * (1 - ky)));

      transformRef.current = { kx, ky, x: tx, y: ty };
      setHasZoomed(kx !== 1 || ky !== 1 || tx !== 0 || ty !== 0);

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(drawChart);
    };

    const handleDoubleClick = () => {
      d3.select(canvas)
        .transition()
        .duration(750)
        .tween("resetZoom", () => {
          const start = { ...transformRef.current };
          const end = { kx: 1, ky: 1, x: 0, y: 0 };
          const iKx = d3.interpolateNumber(start.kx, end.kx);
          const iKy = d3.interpolateNumber(start.ky, end.ky);
          const iX = d3.interpolateNumber(start.x, end.x);
          const iY = d3.interpolateNumber(start.y, end.y);

          return (t) => {
            transformRef.current = { kx: iKx(t), ky: iKy(t), x: iX(t), y: iY(t) };
            if (t === 1) {
              updateBrushCount(selectedBarIds.size || data.length);
              setHasZoomed(false);
            }
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = requestAnimationFrame(drawChart);
          };
        });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("dblclick", handleDoubleClick);
    canvas.addEventListener("mousemove", handleCanvasMouseMove as any);
    canvas.addEventListener("mouseleave", handleCanvasMouseLeave);

    return () => {
      clearTimeout(initialDrawTimer);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("dblclick", handleDoubleClick);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove as any);
      canvas.removeEventListener("mouseleave", handleCanvasMouseLeave);
      d3.select(canvas).on(".drag", null);
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
    _width,
    _height,
    margin.left,
    margin.top
  ]);

  useEffect(() => {
    if (!zoomEnabled && canvasRef.current) {
      // Volta para o estado inicial suavemente quando desativado
      d3.select(canvasRef.current)
        .transition()
        .duration(300)
        .tween("resetZoom", () => {
          const start = { ...transformRef.current };
          const end = { kx: 1, ky: 1, x: 0, y: 0 };
          const iKx = d3.interpolateNumber(start.kx, end.kx);
          const iKy = d3.interpolateNumber(start.ky, end.ky);
          const iX = d3.interpolateNumber(start.x, end.x);
          const iY = d3.interpolateNumber(start.y, end.y);

          return (t) => {
            transformRef.current = { kx: iKx(t), ky: iKy(t), x: iX(t), y: iY(t) };
            if (t === 1) {
              updateBrushCount(selectedBarIds.size || data.length);
              setHasZoomed(false);
            }
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = requestAnimationFrame(drawChart);
          };
        });
    }
  }, [zoomEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(drawChart);
  }, [selectedBars, selectedMinBars, selectedMaxBars, drawChart]);

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
    <Card className={cn("shadow-none w-min-content min-w-1/2 p-1 m-0!")}>
      {/* Reduzindo o padding padrão do CardContent */}
      <CardContent className="m-0!">
        <div ref={containerRef} className="w-full overflow-hidden relative">
          {/* Ajustado o translate-x para compensar a nova margem esquerda mais fina */}
          <span className="absolute text-xs w-full text-center text-foreground/70 block rotate-270 left-0 -translate-x-[47.5%] -translate-y-1/2 top-1/2 h-8 m-0 p-0">
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
              height: _height + margin.top + margin.bottom - 2,
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
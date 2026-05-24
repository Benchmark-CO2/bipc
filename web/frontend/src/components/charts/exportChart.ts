import { IBenchmarkItem } from "@/actions/benchmarks/types";
import { Translations } from "@/i18n/translations/pt-BR";
import * as d3 from "d3";
import { regressionPoly } from "d3-regression";

// ── Constants (mirrored from d3chart.tsx) ──────────────────────────────────────

const DEFAULT_COLORS = {
  START: "#3b82f6",
  END: "#E36F35",
  GRAY_START: "#cbd5e1",
  GRAY_END: "#94a3b8",
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
  BAR_HEIGHT: 8,
  MINIMAL_BAR_HEIGHT: 3,
  CIRCLE_RADIUS: { expanded: 2, normal: 1.5 },
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

type ProcelLabel = (typeof PROCEL_CLASSES)[number]["label"];

const UNIT_LABELS: Record<string, string> = {
  "KgCO₂/m²": "Carbono Embutido (kg CO₂/m²)",
  "MJ/m²": "Energia Incorporada (MJ/m²)",
};

// ── Types ──────────────────────────────────────────────────────────────────────

type ExportChartData = IBenchmarkItem & {
  label: string;
  floors?: string | number;
  technology?: string[];
  minId?: string;
  maxId?: string;
};

export type ExportChartOptions = {
  /** Chart data points */
  data: ExportChartData[];
  /** IDs of selected bars (used for both min and max when specific sets are not provided) */
  selectedBars?: string[];
  /** IDs of selected min-side bars */
  selectedMinBars?: string[];
  /** IDs of selected max-side bars */
  selectedMaxBars?: string[];
  /** Unit label, e.g. "KgCO₂/m²" */
  unit?: string;
  /** Hide connecting bars between min/max */
  hideBars?: boolean;

  // ── PROCEL scale ───────────────────────────────────────────────────────────
  /** Show the PROCEL color scale on the right */
  showProcelScale?: boolean;
  /**
   * Which PROCEL class to highlight ("A" | "B" | "C" | "D").
   * The highlighted band keeps full color; others are drawn at `procelFadedOpacity`.
   * Pass `null`/`undefined` to keep all bands equally vivid.
   */
  procelHighlight?: ProcelLabel | null;
  /** Opacity applied to non-highlighted PROCEL bands (0–1). Default: 0.25 */
  procelFadedOpacity?: number;

  // ── Reference lines ────────────────────────────────────────────────────────
  showBaseline?: boolean;
  showTop5Line?: boolean;
  /** Which field to use for the PPp line: "min" or "max". Default: "max" */
  top5Field?: "min" | "max";
  /** Percentile threshold for the PPp line (0–1). Default: 0.05 */
  top5Percentile?: number;

  // ── Dashed curves ──────────────────────────────────────────────────────────
  /** Show dashed curve following the max values */
  showMaxCurve?: boolean;
  /** Show dashed curve following the min values */
  showMinCurve?: boolean;
  /** Show dashed curve for Vn = (C5% - Cn) + (R5% - Rn) / 2 */
  showMidCurve?: boolean;

  // ── Output size ────────────────────────────────────────────────────────────
  /** Output width in pixels. Default: 550 */
  widthPx?: number;
  /** Output height in pixels. Default: 383 */
  heightPx?: number;
  /** DPI used for px→mm conversion. Default: 96 */
  dpi?: number;
  /** Canvas pixel ratio for sharper output. Default: 2 */
  scale?: number;

  // ── Visual style ───────────────────────────────────────────────────────────
  /** Use expanded (larger circles/bars) visual style. Default: true */
  expanded?: boolean;
  /** Background color. Default: "#ffffff" */
  bgColor?: string;
  /** X-axis label override */
  xAxisLabel?: string;
};

export type ExportChartResult = {
  /** PNG as data-URL (data:image/png;base64,…) */
  dataUrl: string;
  /** Raw base64 string (without the data-URL prefix) */
  base64: string;
  /** PNG blob */
  blob: Blob;
  /** Image width in millimetres (at the chosen DPI) */
  widthMm: number;
  /** Image height in millimetres (at the chosen DPI) */
  heightMm: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function pxToMm(px: number, dpi: number): number {
  return +((px / dpi) * 25.4).toFixed(2);
}

function polyfillRoundRect(ctx: CanvasRenderingContext2D) {
  if (!ctx.roundRect) {
    (ctx as any).roundRect = function (
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number | number[],
    ) {
      const r = typeof radius === "number" ? radius : radius[0];
      this.beginPath();
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r);
      this.lineTo(x + w, y + h - r);
      this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.lineTo(x + r, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r);
      this.lineTo(x, y + r);
      this.quadraticCurveTo(x, y, x + r, y);
      this.closePath();
    };
  }
}

// ── Main export function ───────────────────────────────────────────────────────

/**
 * Renders the benchmark chart to an offscreen canvas and returns a PNG image
 * as base64, data-URL, Blob, and dimensions in millimetres.
 */
export async function exportChartToPng(
  opts: ExportChartOptions,
  t: Translations,
): Promise<ExportChartResult> {
  const {
    data,
    selectedBars = [],
    selectedMinBars,
    selectedMaxBars,
    unit = "",
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
    widthPx = 550,
    heightPx = 383,
    dpi = 96,
    scale = 2,
    expanded = true,
    bgColor = "#ffffff",
    xAxisLabel,
  } = opts;

  // ── Dimensions ───────────────────────────────────────────────────────────
  const margin = {
    top: 15,
    right: showProcelScale ? 26 : 20,
    bottom: 35,
    left: 50,
  };

  const chartW = widthPx - margin.left - margin.right;
  const chartH = heightPx - margin.top - margin.bottom;

  // ── Offscreen canvas ─────────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.width = widthPx * scale;
  canvas.height = heightPx * scale;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  ctx.scale(scale, scale);
  polyfillRoundRect(ctx);

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, widthPx, heightPx);

  // ── Scales ───────────────────────────────────────────────────────────────
  const maxValue =
    (data.map((d) => d.max).reduce((a, b) => Math.max(a, b), 0) || 170) * 1.1;

  const xScale = d3
    .scaleLinear()
    .domain([0, maxValue * 1.15])
    .range([0, chartW * 1.1]);

  const yScale = d3.scaleLinear().domain([0, 1.01]).range([chartH, 0]);

  // ── Selection sets ───────────────────────────────────────────────────────
  const selectedMinBarIds = new Set(
    (selectedMinBars ?? selectedBars).map(String),
  );
  const selectedMaxBarIds = new Set(
    (selectedMaxBars ?? selectedBars).map(String),
  );

  // ── Begin drawing ────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(margin.left, margin.top);

  // Clip to chart area
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, chartW, chartH);
  ctx.clip();

  // Grid lines
  ctx.strokeStyle = DEFAULT_COLORS.GRID;
  ctx.lineWidth = 1;

  xScale.ticks(10).forEach((tick) => {
    const x = xScale(tick);
    if (x >= 0 && x <= chartW) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartH);
      ctx.stroke();
    }
  });

  yScale.ticks(8).forEach((tick) => {
    const y = yScale(tick);
    if (y >= 0 && y <= chartH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();
    }
  });

  // Baseline
  let baselineY: number | null = null;
  if (showBaseline) {
    const by = yScale(0.5);
    if (by >= 0 && by <= chartH) baselineY = by;
  }

  // PPp 5% line and 5% reference values for V calculation
  let p5LineX: number | null = null;
  let p5LineInView = false;
  let c5Value: number | null = null; // C5% - min value at 5th percentile
  let r5Value: number | null = null; // R5% - max value at 5th percentile
  if (showTop5Line && data.length > 0) {
    // Calculate C5% (5th percentile of min values)
    const sortedMin = [...data].map((d) => d.min).sort((a, b) => a - b);
    const idx = Math.floor(sortedMin.length * top5Percentile);
    c5Value = sortedMin[Math.min(idx, sortedMin.length - 1)];
    
    // Calculate R5% (5th percentile of max values)
    const sortedMax = [...data].map((d) => d.max).sort((a, b) => a - b);
    r5Value = sortedMax[Math.min(idx, sortedMax.length - 1)];
    
    // Use the specified field for the PPp line (default: min)
    const p5Value = top5Field === "min" ? c5Value : r5Value;
    p5LineX = xScale(p5Value);
    p5LineInView = p5LineX >= 0 && p5LineX <= chartW;
  }

  // ── Pre-compute mid curve regression for bar split ───────────────────────
  let midPredict: ((yVal: number) => number) | null = null;
  if (showMidCurve && data.length >= 3) {
    const sorted = [...data].sort((a, b) => a.y - b.y);
    const raw: [number, number][] = sorted.map((d) => [
      (d.min + d.max) / 2,
      d.y,
    ]);
    const regression = regressionPoly()
      .x((d: [number, number]) => d[1])
      .y((d: [number, number]) => d[0])
      .order(Math.min(4, raw.length - 1));
    const result = regression(raw);
    midPredict = (yVal: number) => Math.max(0, result.predict(yVal));
  }

  // ── Pass 1: non-selected points ─────────────────────────────────────────
  const hasActiveFilter =
    selectedMinBarIds.size > 0 || selectedMaxBarIds.size > 0;

  data.forEach((d) => {
    const x1 = xScale(d.min);
    const x2 = xScale(d.max);
    const y = yScale(d.y);
    if (x2 < 0 || x1 > chartW || y < 0 || y > chartH) return;

    const isMinSelected = selectedMinBarIds.has(String(d.minId ?? d.id));
    const isMaxSelected = selectedMaxBarIds.has(String(d.maxId ?? d.id));

    if (!isMinSelected || !isMaxSelected) {
      const radius = expanded
        ? CHART_CONFIG.CIRCLE_RADIUS.expanded
        : CHART_CONFIG.CIRCLE_RADIUS.normal;
      const strokeWidth = expanded ? 2 : 0;
      const useGray = hideBars && hasActiveFilter;
      const circleOpacity = hasActiveFilter ? procelFadedOpacity : 1;
      ctx.globalAlpha = circleOpacity;

      if (!isMinSelected) {
        ctx.beginPath();
        ctx.arc(x1, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = useGray
          ? DEFAULT_COLORS.GRAY_START
          : DEFAULT_COLORS.START;
        ctx.fill();
      }

      if (!isMaxSelected) {
        ctx.beginPath();
        ctx.arc(x2, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = useGray ? DEFAULT_COLORS.GRAY_END : DEFAULT_COLORS.END;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  });

  // ── Pass 2: selected points (on top) ────────────────────────────────────
  let selectedAnnotation: {
    x1: number;
    x2: number;
    xMid: number;
    y: number;
    barHeight: number;
  } | null = null;
  data.forEach((d) => {
    const x1 = xScale(d.min);
    const x2 = xScale(d.max);
    const y = yScale(d.y);
    if (x2 < 0 || x1 > chartW || y < 0 || y > chartH) return;

    const isMinSelected = selectedMinBarIds.has(String(d.minId ?? d.id));
    const isMaxSelected = selectedMaxBarIds.has(String(d.maxId ?? d.id));
    const isPairSelected = isMinSelected && isMaxSelected;

    if (isMinSelected || isMaxSelected) {
      const barHeight = expanded
        ? CHART_CONFIG.BAR_HEIGHT
        : CHART_CONFIG.MINIMAL_BAR_HEIGHT;
      const barY = y - barHeight / 2;
      const barWidth = Math.max(1, x2 - x1);

      if (!hideBars && isPairSelected) {
        const midValue = midPredict ? midPredict(d.y) : (d.min + d.max) / 2;
        const xMid = xScale(midValue);
        const rr = expanded ? barHeight / 2 : 2;

        // Blue half: min → mid
        ctx.fillStyle = DEFAULT_COLORS.START;
        ctx.beginPath();
        (ctx as any).roundRect(x1, barY, Math.max(1, xMid - x1), barHeight, {
          upperLeft: rr,
          lowerLeft: rr,
          upperRight: 0,
          lowerRight: 0,
        });
        ctx.fill();

        // Red half: mid → max
        ctx.fillStyle = DEFAULT_COLORS.END;
        ctx.beginPath();
        (ctx as any).roundRect(xMid, barY, Math.max(1, x2 - xMid), barHeight, {
          upperLeft: 0,
          lowerLeft: 0,
          upperRight: rr,
          lowerRight: rr,
        });
        ctx.fill();
      }

      const radius = expanded
        ? CHART_CONFIG.CIRCLE_RADIUS.expanded
        : CHART_CONFIG.CIRCLE_RADIUS.normal;
      const strokeWidth = expanded ? 2 : 0;

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

      // ── Collect annotation data for drawing outside clip ────────────
      if (isPairSelected) {
        // Calculate V using the formula: Vn = (C5% - Cn) + (R5% - Rn) / 2
        let midValue: number;
        if (c5Value !== null && r5Value !== null) {
          midValue = (c5Value - d.min) + (r5Value - d.max) / 2;
          // If V is negative, use simple average as fallback
          if (midValue < 0) midValue = (d.min + d.max) / 2;
        } else {
          midValue = (d.min + d.max) / 2;
        }
        const xMid = xScale(midValue);
        selectedAnnotation = {
          x1,
          x2,
          xMid,
          y,
          barHeight: expanded
            ? CHART_CONFIG.BAR_HEIGHT
            : CHART_CONFIG.MINIMAL_BAR_HEIGHT,
        };
      }
    }
  });

  // ── Baseline ─────────────────────────────────────────────────────────────
  if (baselineY !== null) {
    ctx.save();
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 0.75;
    ctx.setLineDash([1, 3]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, baselineY);
    ctx.lineTo(chartW, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("linha de base", 4, baselineY - 3);
    ctx.restore();
  }

  // ── Dashed curves (min / mid / max) — polynomial regression trend lines ──
  if (showMaxCurve || showMinCurve || showMidCurve) {
    const sorted = [...data].sort((a, b) => a.y - b.y);

    const buildTrendPoints = (
      rawData: [number, number][],
      steps = 80,
      clampZero = true,
    ): { x: number; y: number }[] => {
      if (rawData.length < 3)
        return rawData.map(([x, y]) => ({ x: xScale(x), y: yScale(y) }));
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
        pts.push({ x: xScale(xVal), y: yScale(yVal) });
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
      const raw: [number, number][] = sorted.map((d) => [
        (d.min + d.max) / 2,
        d.y,
      ]);
      drawTrendCurve(buildTrendPoints(raw));
    }
  }

  // ── PPp 5% line ──────────────────────────────────────────────────────────
  if (p5LineX !== null && p5LineInView) {
    ctx.save();
    ctx.strokeStyle = "#00A650";
    ctx.lineWidth = 0.75;
    ctx.setLineDash([1, 3]);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p5LineX, 0);
    ctx.lineTo(p5LineX, chartH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#00A650";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("5%", p5LineX + 4, 4);
    ctx.restore();
  }

  // End clipping
  ctx.restore();

  // ── Labels & arrow on selected bar (drawn outside clip) ────────────────
  if (selectedAnnotation) {
    const { x1, x2, xMid, y, barHeight } = selectedAnnotation;
    const labelR = 6;
    const labelY = y - barHeight / 2 - labelR - 2;

    ctx.save();
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // "C" label at min (blue)
    ctx.fillStyle = DEFAULT_COLORS.START;
    ctx.beginPath();
    ctx.arc(x1, labelY, labelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText("C", x1, labelY);

    // "V" label at mid (green)
    ctx.fillStyle = "#63B332";
    ctx.beginPath();
    ctx.arc(xMid, labelY, labelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText("V", xMid, labelY);

    // "R" label at max (red)
    ctx.fillStyle = DEFAULT_COLORS.END;
    ctx.beginPath();
    ctx.arc(x2, labelY, labelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText("R", x2, labelY);

    // Purple arrow from C (min) to PPp 5% line - aligned with the bar
    if (p5LineX !== null && Math.abs(p5LineX - x1) > labelR) {
      const arrowLeft = Math.min(x1, p5LineX);
      const arrowRight = Math.max(x1, p5LineX);
      const headSize = 4;

      ctx.strokeStyle = "#7B2D8E";
      ctx.fillStyle = "#7B2D8E";
      ctx.lineWidth = 1;

      // Line - aligned with bar center (y)
      ctx.beginPath();
      ctx.moveTo(arrowLeft, y);
      ctx.lineTo(arrowRight, y);
      ctx.stroke();

      // Left arrowhead
      ctx.beginPath();
      ctx.moveTo(arrowLeft, y);
      ctx.lineTo(arrowLeft + headSize, y - headSize / 2);
      ctx.lineTo(arrowLeft + headSize, y + headSize / 2);
      ctx.closePath();
      ctx.fill();

      // Right arrowhead
      ctx.beginPath();
      ctx.moveTo(arrowRight, y);
      ctx.lineTo(arrowRight - headSize, y - headSize / 2);
      ctx.lineTo(arrowRight - headSize, y + headSize / 2);
      ctx.closePath();
      ctx.fill();

      // "P" label at midpoint of arrow, aligned with the bar
      const arrowMidX = (arrowLeft + arrowRight) / 2;
      ctx.fillStyle = "#7B2D8E";
      ctx.beginPath();
      ctx.arc(arrowMidX, y, labelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText("P", arrowMidX, y);
    }

    ctx.restore();
  }

  // Restore root translation (still translated by margin)
  ctx.restore();

  // ── Axes ─────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(margin.left, margin.top);

  ctx.strokeStyle = DEFAULT_COLORS.TEXT;
  ctx.lineWidth = 1;

  // X-axis line
  ctx.beginPath();
  ctx.moveTo(0, chartH);
  ctx.lineTo(chartW, chartH);
  ctx.stroke();

  // Y-axis line
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, chartH);
  ctx.stroke();

  // X-axis ticks
  ctx.fillStyle = DEFAULT_COLORS.TEXT;
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  xScale.ticks(Math.min(10, Math.floor(chartW / 60))).forEach((tick) => {
    const x = xScale(tick);
    if (x >= 0 && x <= chartW) {
      ctx.beginPath();
      ctx.moveTo(x, chartH);
      ctx.lineTo(x, chartH + 6);
      ctx.stroke();
      ctx.fillText((tick as number).toInternational(), x, chartH + 8);
    }
  });

  // Y-axis ticks
  ctx.textAlign = "end";
  ctx.textBaseline = "middle";

  yScale.ticks(8).forEach((tick) => {
    const y = yScale(tick);
    if (y >= 0 && y <= chartH) {
      ctx.beginPath();
      ctx.moveTo(-6, y);
      ctx.lineTo(0, y);
      ctx.stroke();
      ctx.fillText((tick as number).toInternational(), -10, y);
    }
  });

  // ── PROCEL scale ─────────────────────────────────────────────────────────
  if (showProcelScale) {
    const barWidth = PROCEL_SCALE_CONFIG.WIDTH;
    const barX = chartW + (margin.right - barWidth) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(barX - 1, 0, barWidth + 2, chartH);
    ctx.clip();

    const reversed = [...PROCEL_CLASSES].reverse();
    reversed.forEach((cls, i) => {
      const domainTop = 1.0 - i * 0.25;
      const domainBottom = 1.0 - (i + 1) * 0.25;
      const bandTop = Math.max(0, yScale(domainTop));
      const bandBottom = Math.min(chartH, yScale(domainBottom));
      if (bandBottom <= bandTop) return;
      const bandH = Math.ceil(bandBottom - bandTop);

      // Highlight logic: if a class is specified, fade all others
      const isHighlighted =
        procelHighlight == null || cls.label === procelHighlight;
      ctx.globalAlpha = isHighlighted ? 1 : procelFadedOpacity;

      ctx.fillStyle = cls.color;
      ctx.fillRect(barX, bandTop, barWidth, bandH);

      ctx.fillStyle = "#111827";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cls.label, barX + barWidth / 2, bandTop + bandH / 2);

      ctx.globalAlpha = 1;
    });

    ctx.restore();
  }

  // ── Axis labels ──────────────────────────────────────────────────────────

  // Y-axis label (rotated)
  ctx.save();
  ctx.font = "11px sans-serif";
  ctx.fillStyle = DEFAULT_COLORS.TEXT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(-margin.left + 12, chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(t.benchmark.chartTypes.cumulativeFraction.yAxisLabel, 0, 0);
  ctx.restore();

  // X-axis label
  const labelX = xAxisLabel ?? UNIT_LABELS[unit] ?? "Carbono Embutido";
  ctx.font = "11px sans-serif";
  ctx.fillStyle = DEFAULT_COLORS.TEXT;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(labelX, chartW / 2, chartH + 22);

  ctx.restore();

  // ── Produce output ───────────────────────────────────────────────────────
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png");
  });

  return {
    dataUrl,
    base64,
    blob,
    widthMm: pxToMm(widthPx, dpi),
    heightMm: pxToMm(heightPx, dpi),
  };
}

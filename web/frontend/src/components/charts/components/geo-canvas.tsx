import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  count: number | null;
}

interface GeoFeature<P> {
  type: "Feature";
  properties: P;
  geometry: d3.GeoPermissibleObjects;
}

interface GeoCollection<P> {
  type: "FeatureCollection";
  features: GeoFeature<P>[];
}

export interface GeoCanvasProps<P extends { sigla?: string; codarea?: string }> {
  geo: GeoCollection<P>;
  keyProp: "sigla" | "codarea";
  colorScale: (key: string) => string;
  width: number;
  height: number;
  tooltipLabel: (key: string) => { label: string; count: number | null };
  onFeatureClick?: (key: string) => void;
  className?: string;
  noProjectsLabel?: string;
  projectLabel?: string;
  projectsLabel?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildColorMaps<P extends { sigla?: string; codarea?: string }>(
  features: GeoFeature<P>[],
  keyProp: "sigla" | "codarea",
) {
  const colorToKey = new Map<string, string>();
  const keyToColor = new Map<string, string>();
  features.forEach((feat, idx) => {
    const key = (feat.properties[keyProp] as string) ?? String(idx + 1);
    const i = idx + 1;
    const r = (i >> 16) & 0xff;
    const g = (i >> 8) & 0xff;
    const b = i & 0xff;
    colorToKey.set(`${r},${g},${b}`, key);
    keyToColor.set(key, `rgb(${r},${g},${b})`);
  });
  return { colorToKey, keyToColor };
}

function hitTest(
  clientX: number,
  clientY: number,
  visibleCanvas: HTMLCanvasElement,
  hitCanvas: HTMLCanvasElement,
  colorToKey: Map<string, string>,
): string | null {
  const rect = visibleCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const scaleX = (hitCanvas.width / dpr) / rect.width;
  const scaleY = (hitCanvas.height / dpr) / rect.height;
  const px = Math.round((clientX - rect.left) * scaleX * dpr);
  const py = Math.round((clientY - rect.top) * scaleY * dpr);
  const ctx = hitCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const [r, g, b] = ctx.getImageData(px, py, 1, 1).data;
  return colorToKey.get(`${r},${g},${b}`) ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GeoCanvas<P extends { sigla?: string; codarea?: string }>({
  geo,
  keyProp,
  colorScale,
  width,
  height,
  tooltipLabel,
  onFeatureClick,
  className,
  noProjectsLabel = "Sem projetos",
  projectLabel = "projeto",
  projectsLabel = "projetos",
}: GeoCanvasProps<P>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    count: null,
  });

  const { colorMaps, projection } = useMemo(() => {
    const colorMaps = buildColorMaps(geo.features, keyProp);
    const projection = d3
      .geoMercator()
      .fitSize([width, height], geo as unknown as d3.ExtendedFeatureCollection);
    return { colorMaps, projection };
  }, [geo, keyProp, width, height]);

  // Paint hit canvas (invisible, used for mouse picking)
  useEffect(() => {
    const hitCanvas = hitCanvasRef.current;
    if (!hitCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    hitCanvas.width = width * dpr;
    hitCanvas.height = height * dpr;
    const ctx = hitCanvas.getContext("2d", { willReadFrequently: true })!;
    ctx.save();
    ctx.scale(dpr, dpr);
    const path = d3.geoPath(projection);
    for (const feat of geo.features) {
      const key = feat.properties[keyProp] as string;
      const color = colorMaps.keyToColor.get(key);
      if (!color) continue;
      ctx.beginPath();
      path.context(ctx)(feat.geometry);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }, [geo, projection, colorMaps, keyProp, width, height]);

  // Paint visible canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.scale(dpr, dpr);
    const path = d3.geoPath(projection);
    for (const feat of geo.features) {
      const key = feat.properties[keyProp] as string;
      const isHovered = key === hoveredKey;
      ctx.beginPath();
      path.context(ctx)(feat.geometry);
      ctx.fillStyle = colorScale(key);
      ctx.fill();
      ctx.strokeStyle = isHovered ? "#187B8B" : "#000";
      ctx.lineWidth = isHovered ? 1.5 : 0.4;
      ctx.stroke();
    }
    ctx.restore();
  }, [geo, projection, colorScale, hoveredKey, keyProp, width, height]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const hitCanvas = hitCanvasRef.current;
      if (!canvas || !hitCanvas) return;
      const key = hitTest(e.clientX, e.clientY, canvas, hitCanvas, colorMaps.colorToKey);
      setHoveredKey(key);
      if (key) {
        const { label, count } = tooltipLabel(key);
        const rect = canvas.getBoundingClientRect();
        setTooltip({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top, label, count });
      } else {
        setTooltip((p) => ({ ...p, visible: false }));
      }
    },
    [colorMaps, tooltipLabel],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredKey(null);
    setTooltip((p) => ({ ...p, visible: false }));
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onFeatureClick) return;
      const canvas = canvasRef.current;
      const hitCanvas = hitCanvasRef.current;
      if (!canvas || !hitCanvas) return;
      const key = hitTest(e.clientX, e.clientY, canvas, hitCanvas, colorMaps.colorToKey);
      if (key) onFeatureClick(key);
    },
    [colorMaps, onFeatureClick],
  );

  return (
    <div className={`relative ${className ?? ""}`} style={{ width: "100%", height }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height, display: "block" }}
        className={onFeatureClick ? "cursor-pointer" : "cursor-default"}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      <canvas ref={hitCanvasRef} style={{ display: "none" }} />
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-lg"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 12,
            transform:
              tooltip.x > width * 0.65 ? "translateX(calc(-100% - 28px))" : undefined,
          }}
        >
          <p className="font-semibold text-foreground">{tooltip.label}</p>
          {tooltip.count !== null && tooltip.count > 0 ? (
            <p className="text-muted-foreground">
              <span className="font-medium text-primary">{tooltip.count}</span>{" "}
              {tooltip.count !== 1 ? projectsLabel : projectLabel}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{noProjectsLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}

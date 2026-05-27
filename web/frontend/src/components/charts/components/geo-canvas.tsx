import * as d3 from "d3";
import { Search, SearchX } from "lucide-react";
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
  allowZoom?: boolean;
  zoomEnableTitle?: string;
  zoomDisableTitle?: string;
  zoomButtonLabel?: string;
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
  allowZoom = false,
  zoomEnableTitle = "Habilitar zoom",
  zoomDisableTitle = "Desabilitar zoom",
  zoomButtonLabel = "Zoom",
}: GeoCanvasProps<P>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transformRef = useRef(d3.zoomIdentity);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [zoomEnabled, setZoomEnabled] = useState(false);
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

  const drawCanvases = useCallback(() => {
    const canvas = canvasRef.current;
    const hitCanvas = hitCanvasRef.current;
    if (!canvas || !hitCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const transform = transformRef.current;
    const path = d3.geoPath(projection);

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const visibleCtx = canvas.getContext("2d");
    if (!visibleCtx) return;
    visibleCtx.save();
    visibleCtx.scale(dpr, dpr);
    visibleCtx.clearRect(0, 0, width, height);
    visibleCtx.translate(transform.x, transform.y);
    visibleCtx.scale(transform.k, transform.k);
    for (const feat of geo.features) {
      const key = feat.properties[keyProp] as string;
      const isHovered = key === hoveredKey;
      visibleCtx.beginPath();
      path.context(visibleCtx)(feat.geometry);
      visibleCtx.fillStyle = colorScale(key);
      visibleCtx.fill();
      visibleCtx.strokeStyle = isHovered ? "#187B8B" : "#000";
      visibleCtx.lineWidth = (isHovered ? 1.5 : 0.4) / transform.k;
      visibleCtx.stroke();
    }
    visibleCtx.restore();

    hitCanvas.width = width * dpr;
    hitCanvas.height = height * dpr;

    const hitCtx = hitCanvas.getContext("2d", { willReadFrequently: true });
    if (!hitCtx) return;
    hitCtx.save();
    hitCtx.scale(dpr, dpr);
    hitCtx.clearRect(0, 0, width, height);
    hitCtx.translate(transform.x, transform.y);
    hitCtx.scale(transform.k, transform.k);
    for (const feat of geo.features) {
      const key = feat.properties[keyProp] as string;
      const color = colorMaps.keyToColor.get(key);
      if (!color) continue;
      hitCtx.beginPath();
      path.context(hitCtx)(feat.geometry);
      hitCtx.fillStyle = color;
      hitCtx.fill();
    }
    hitCtx.restore();
  }, [geo, projection, colorScale, hoveredKey, keyProp, width, height, colorMaps]);

  useEffect(() => {
    drawCanvases();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawCanvases]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoom = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([1, 8])
      .filter((event) => {
        if (!allowZoom || !zoomEnabled) return false;
        return !event.button && event.type !== "dblclick";
      })
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(drawCanvases);
      });

    zoomRef.current = zoom;
    d3.select(canvas).call(zoom as any);

    return () => {
      d3.select(canvas).on(".zoom", null);
    };
  }, [allowZoom, zoomEnabled, drawCanvases]);

  useEffect(() => {
    if (!allowZoom) {
      setZoomEnabled(false);
    }
  }, [allowZoom]);

  useEffect(() => {
    if (zoomEnabled || !canvasRef.current || !zoomRef.current) return;
    d3.select(canvasRef.current)
      .transition()
      .duration(250)
      .call(zoomRef.current.transform as any, d3.zoomIdentity);
    transformRef.current = d3.zoomIdentity;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(drawCanvases);
  }, [zoomEnabled, drawCanvases]);

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
      {allowZoom && (
        <button
          type="button"
          onClick={() => setZoomEnabled((prev) => !prev)}
          className={`absolute top-2 left-2 z-10 p-1.5 rounded-md border text-xs flex items-center gap-1 transition-colors ${
            zoomEnabled
              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
              : "bg-background text-muted-foreground border-border hover:bg-muted"
          }`}
          title={zoomEnabled ? zoomDisableTitle : zoomEnableTitle}
        >
          {zoomEnabled ? <Search className="size-3.5" /> : <SearchX className="size-3.5" />}
          <span className="max-sm:hidden">{zoomButtonLabel}</span>
        </button>
      )}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height, display: "block" }}
        className={
          allowZoom && zoomEnabled
            ? "cursor-grab active:cursor-grabbing"
            : onFeatureClick
              ? "cursor-pointer"
              : "cursor-default"
        }
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ArrowLeft } from "lucide-react";

import { StateMapData } from "@/hooks/useBenchmarkMapData";
import { useIBGEMunicipalities } from "@/hooks/useIBGEMunicipalities";
import { countToColor, normalizeCity } from "@/utils/geoUtils";
import GeoCanvas from "@/components/charts/components/geo-canvas";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StateProperties {
  codarea: string;
  sigla: string;
  name: string;
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

type ViewMode = { type: "country" } | { type: "state"; sigla: string };

export interface MapChartStats {
  isStateView: boolean;
  sigla?: string;
  stateName: string;
  projectCount: number;
  noStateCount: number;
  unmatchedCount: number;
  maxCount: number;
}

export interface BrazilMapChartProps {
  data: StateMapData[];
  totalCount?: number;
  noStateCount?: number;
  unit?: string;
  className?: string;
  maxHeight?: number;
  allowZoom?: boolean;
  onStatsChange?: (stats: MapChartStats) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ASPECT_RATIO = 720 / 800;

// ─── Component ────────────────────────────────────────────────────────────────
export default function BrazilMapChart({
  data,
  totalCount,
  noStateCount = 0,
  className,
  maxHeight,
  allowZoom = false,
  onStatsChange,
}: BrazilMapChartProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [statesGeo, setStatesGeo] =
    useState<GeoCollection<StateProperties> | null>(null);
  const [view, setView] = useState<ViewMode>({ type: "country" });

  const activeSigla = view.type === "state" ? view.sigla : null;
  const { data: munData, isLoading: munLoading } =
    useIBGEMunicipalities(activeSigla);

  const autoHeight = Math.round(containerWidth * ASPECT_RATIO);
  const height = maxHeight ? Math.min(autoHeight, maxHeight) : autoHeight;

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = (w: number) => {
      const r = Math.round(w);
      if (r > 0) setContainerWidth(r);
    };
    const observer = new ResizeObserver((entries) => {
      update(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(el);
    update(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  // Load brazil states GeoJSON (bundled in /public)
  useEffect(() => {
    fetch("/brazil-states.json")
      .then((r) => r.json())
      .then((json: GeoCollection<StateProperties>) => setStatesGeo(json));
  }, []);

  // Enrich municipality geo features with IBGE names when drill-down loads
  const munGeo = useMemo(() => {
    if (!munData) return null;
    const { geo, nameMap } = munData;
    return {
      ...geo,
      features: geo.features.map((f) => ({
        ...f,
        geometry: f.geometry as d3.GeoPermissibleObjects,
        properties: {
          ...f.properties,
          name: nameMap.get(f.properties.codarea) ?? f.properties.codarea,
        },
      })),
    };
  }, [munData]);

  // ── Data maps ──────────────────────────────────────────────────────────────
  const dataMap = useMemo(() => new Map(data.map((d) => [d.sigla, d])), [data]);
  const maxStateCount = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data],
  );

  // ── State view helpers ─────────────────────────────────────────────────────
  const stateColorScale = useCallback(
    (sigla: string) =>
      countToColor(dataMap.get(sigla)?.value ?? 0, maxStateCount),
    [dataMap, maxStateCount],
  );

  const stateTooltipLabel = useCallback(
    (sigla: string) => {
      const feat = statesGeo?.features.find(
        (f) => f.properties.sigla === sigla,
      );
      const count = dataMap.get(sigla)?.value ?? 0;
      return {
        label: `${feat?.properties.name ?? sigla} (${sigla})`,
        count: count > 0 ? count : null,
      };
    },
    [statesGeo, dataMap],
  );

  // ── Municipality view helpers ──────────────────────────────────────────────
  const munCityLookup = useMemo(() => {
    if (view.type !== "state") return new Map<string, number>();
    const cities = dataMap.get(view.sigla)?.cities ?? {};

    // DF uses administrative regions instead of IBGE municipalities —
    // collapse everything into the single IBGE municipality "Brasília".
    if (view.sigla === "DF") {
      const total = Object.values(cities).reduce((sum, c) => sum + c, 0);
      return new Map([["brasilia", total]]);
    }

    const lookup = new Map<string, number>();
    for (const [name, count] of Object.entries(cities)) {
      const key = normalizeCity(name);
      lookup.set(key, (lookup.get(key) ?? 0) + count);
    }
    return lookup;
  }, [view, dataMap]);

  const maxMunCount = useMemo(
    () => Math.max(...munCityLookup.values(), 1),
    [munCityLookup],
  );

  const munColorScale = useMemo(() => {
    if (!munGeo) return null;
    return (codarea: string) => {
      const feat = munGeo.features.find(
        (f) => f.properties.codarea === codarea,
      );
      const count =
        munCityLookup.get(normalizeCity(feat?.properties.name ?? "")) ?? 0;
      return countToColor(count, maxMunCount);
    };
  }, [munGeo, munCityLookup, maxMunCount]);

  const munTooltipLabel = useCallback(
    (codarea: string) => {
      if (!munGeo) return { label: "", count: null as number | null };
      const feat = munGeo.features.find(
        (f) => f.properties.codarea === codarea,
      );
      const munName = feat?.properties.name ?? codarea;
      const count = munCityLookup.get(normalizeCity(munName)) ?? 0;
      return { label: munName, count: count > 0 ? count : null };
    },
    [munGeo, munCityLookup],
  );

  // ── Unmatched cities (registered with a city not found in IBGE) ────────────
  const unmatchedCount = useMemo(() => {
    if (view.type !== "state" || !munGeo) return 0;
    const cities = dataMap.get(view.sigla)?.cities ?? {};
    const ibgeNormNames = munGeo.features.map((f) =>
      normalizeCity(f.properties.name ?? ""),
    );
    return Object.entries(cities)
      .filter(([name]) => !ibgeNormNames.includes(normalizeCity(name)))
      .reduce((sum, [, count]) => sum + count, 0);
  }, [view, munGeo, dataMap]);

  // ── Derived state info ─────────────────────────────────────────────────────
  const stateName = useMemo(() => {
    if (view.type !== "state") return "";
    return (
      statesGeo?.features.find((f) => f.properties.sigla === view.sigla)
        ?.properties.name ?? view.sigla
    );
  }, [view, statesGeo]);

  const stateProjectCount = useMemo(() => {
    if (view.type !== "state") return 0;
    return Object.values(dataMap.get(view.sigla)?.cities ?? {}).reduce(
      (s, c) => s + c,
      0,
    );
  }, [view, dataMap]);

  useEffect(() => {
    if (!onStatsChange) return;
    onStatsChange({
      isStateView: view.type === "state",
      sigla: view.type === "state" ? view.sigla : undefined,
      stateName,
      projectCount:
        view.type === "state"
          ? stateProjectCount
          : (totalCount ?? data.reduce((s, d) => s + d.value, 0)),
      noStateCount,
      unmatchedCount,
      maxCount: view.type === "state" ? maxMunCount : maxStateCount,
    });
  }, [
    view,
    stateName,
    stateProjectCount,
    unmatchedCount,
    noStateCount,
    maxMunCount,
    maxStateCount,
    totalCount,
    data,
    onStatsChange,
  ]);

  const isReady = containerWidth > 0 && statesGeo;
  const isLoadingDrilldown = view.type === "state" && munLoading;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", overflow: "hidden" }}
    >
      {!isReady || isLoadingDrilldown ? (
        <div
          className="flex items-center justify-center gap-2 text-muted-foreground text-sm"
          style={{ height: height || 320 }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          {isLoadingDrilldown
            ? t.brazilMap.loadingMunicipalities
            : t.brazilMap.loadingMap}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ── Navigation ── */}
          {view.type === "state" && (
            <Button
              onClick={() => setView({ type: "country" })}
              variant="outline-bipc"
              size="sm"
              className="w-fit"
            >
              <ArrowLeft className="mr-1" size={16} />
              {t.brazilMap.backToCountry}
            </Button>
          )}

          {/* ── Hint ── */}
          {view.type === "country" && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground italic">
                {t.brazilMap.clickStateHint}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t.brazilMap.colorScaleDescription}
              </p>
            </div>
          )}

          {/* ── Map canvas ── */}
          {view.type === "state" && munGeo ? (
            <GeoCanvas
              geo={munGeo}
              keyProp="codarea"
              colorScale={munColorScale!}
              width={containerWidth}
              height={height}
              tooltipLabel={munTooltipLabel}
              noProjectsLabel={t.brazilMap.noProjects}
              projectLabel={t.brazilMap.project}
              projectsLabel={t.brazilMap.projects}
              allowZoom={allowZoom}
              zoomEnableTitle={t.d3chart.enableZoom}
              zoomDisableTitle={t.d3chart.disableZoom}
              zoomButtonLabel={t.d3chart.zoomLabel}
            />
          ) : (
            <GeoCanvas
              geo={statesGeo!}
              keyProp="sigla"
              colorScale={stateColorScale}
              width={containerWidth}
              height={height}
              tooltipLabel={stateTooltipLabel}
              onFeatureClick={(sigla) => setView({ type: "state", sigla })}
              noProjectsLabel={t.brazilMap.noProjects}
              projectLabel={t.brazilMap.project}
              projectsLabel={t.brazilMap.projects}
              allowZoom={allowZoom}
              zoomEnableTitle={t.d3chart.enableZoom}
              zoomDisableTitle={t.d3chart.disableZoom}
              zoomButtonLabel={t.d3chart.zoomLabel}
            />
          )}
        </div>
      )}
    </div>
  );
}

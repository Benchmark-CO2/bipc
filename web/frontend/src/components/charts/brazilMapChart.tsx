import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ArrowLeft } from "lucide-react";

import { StateMapData } from "@/hooks/useBenchmarkMapData";
import { useIBGEMunicipalities } from "@/hooks/useIBGEMunicipalities";
import { countToColor, normalizeCity } from "@/utils/geoUtils";
import Legend from "@/components/summaryVariants/components/Legend";
import GeoCanvas from "@/components/charts/components/geo-canvas";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StateProperties { codarea: string; sigla: string; name: string; }
interface GeoFeature<P> { type: "Feature"; properties: P; geometry: d3.GeoPermissibleObjects; }
interface GeoCollection<P> { type: "FeatureCollection"; features: GeoFeature<P>[]; }

type ViewMode =
  | { type: "country" }
  | { type: "state"; sigla: string };

export interface BrazilMapChartProps {
  data: StateMapData[];
  totalCount?: number;
  noStateCount?: number;
  unit?: string;
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ASPECT_RATIO = 720 / 800;

// ─── Component ────────────────────────────────────────────────────────────────
export default function BrazilMapChart({ data, totalCount, noStateCount = 0, className }: BrazilMapChartProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [statesGeo, setStatesGeo] = useState<GeoCollection<StateProperties> | null>(null);
  const [view, setView] = useState<ViewMode>({ type: "country" });

  const activeSigla = view.type === "state" ? view.sigla : null;
  const { data: munData, isLoading: munLoading } = useIBGEMunicipalities(activeSigla);

  const height = Math.round(containerWidth * ASPECT_RATIO);

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = (w: number) => { const r = Math.round(w); if (r > 0) setContainerWidth(r); };
    const observer = new ResizeObserver(entries => { update(entries[0]?.contentRect.width ?? 0); });
    observer.observe(el);
    update(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  // Load brazil states GeoJSON (bundled in /public)
  useEffect(() => {
    fetch("/brazil-states.json")
      .then(r => r.json())
      .then((json: GeoCollection<StateProperties>) => setStatesGeo(json));
  }, []);

  // Enrich municipality geo features with IBGE names when drill-down loads
  const munGeo = useMemo(() => {
    if (!munData) return null;
    const { geo, nameMap } = munData;
    return {
      ...geo,
      features: geo.features.map(f => ({
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
  const dataMap = useMemo(() => new Map(data.map(d => [d.sigla, d])), [data]);
  const maxStateCount = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  // ── State view helpers ─────────────────────────────────────────────────────
  const stateColorScale = useCallback(
    (sigla: string) => countToColor(dataMap.get(sigla)?.value ?? 0, maxStateCount),
    [dataMap, maxStateCount],
  );

  const stateTooltipLabel = useCallback((sigla: string) => {
    const feat = statesGeo?.features.find(f => f.properties.sigla === sigla);
    const count = dataMap.get(sigla)?.value ?? 0;
    return { label: `${feat?.properties.name ?? sigla} (${sigla})`, count: count > 0 ? count : null };
  }, [statesGeo, dataMap]);

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

  const munColorScale = useMemo(() => {
    if (!munGeo) return null;
    const maxMun = Math.max(...munCityLookup.values(), 1);
    return (codarea: string) => {
      const feat = munGeo.features.find(f => f.properties.codarea === codarea);
      const count = munCityLookup.get(normalizeCity(feat?.properties.name ?? "")) ?? 0;
      return countToColor(count, maxMun);
    };
  }, [munGeo, munCityLookup]);

  const munTooltipLabel = useCallback((codarea: string) => {
    if (!munGeo) return { label: "", count: null as number | null };
    const feat = munGeo.features.find(f => f.properties.codarea === codarea);
    const munName = feat?.properties.name ?? codarea;
    const count = munCityLookup.get(normalizeCity(munName)) ?? 0;
    return { label: munName, count: count > 0 ? count : null };
  }, [munGeo, munCityLookup]);

  // ── Unmatched cities (registered with a city not found in IBGE) ────────────
  const unmatchedCount = useMemo(() => {
    if (view.type !== "state" || !munGeo) return 0;
    const cities = dataMap.get(view.sigla)?.cities ?? {};
    const ibgeNormNames = munGeo.features.map(f => normalizeCity(f.properties.name ?? ""));
    return Object.entries(cities)
      .filter(([name]) => !ibgeNormNames.includes(normalizeCity(name)))
      .reduce((sum, [, count]) => sum + count, 0);
  }, [view, munGeo, dataMap]);

  // ── Derived state info ─────────────────────────────────────────────────────
  const stateName = useMemo(() => {
    if (view.type !== "state") return "";
    return statesGeo?.features.find(f => f.properties.sigla === view.sigla)?.properties.name ?? view.sigla;
  }, [view, statesGeo]);

  const stateProjectCount = useMemo(() => {
    if (view.type !== "state") return 0;
    return Object.values(dataMap.get(view.sigla)?.cities ?? {}).reduce((s, c) => s + c, 0);
  }, [view, dataMap]);

  const isReady = containerWidth > 0 && statesGeo;
  const isLoadingDrilldown = view.type === "state" && munLoading;

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", overflow: "hidden" }}>
      {!isReady || isLoadingDrilldown ? (
        <div
          className="flex items-center justify-center gap-2 text-muted-foreground text-sm"
          style={{ height: height || 320 }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          {isLoadingDrilldown ? t.brazilMap.loadingMunicipalities : t.brazilMap.loadingMap}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ── Header ── */}
          {view.type === "state" ? (
            <div className="flex flex-col gap-1">
              <Button onClick={() => setView({ type: "country" })} variant="outline-bipc" size="sm" className="w-fit">
                <ArrowLeft className="mr-1" size={16} />
                {t.brazilMap.backToCountry}
              </Button>
              <div className="flex items-baseline gap-2">
                <h2 className="text-xl font-bold text-foreground">{stateName}</h2>
                <span className="text-sm text-muted-foreground font-medium">{view.sigla}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {t.d3chart.numberOfProjects}:{" "}
                  <span className="font-medium text-foreground">{stateProjectCount}</span>
                </span>
                {unmatchedCount > 0 && (
                  <span title={t.brazilMap.unmatchedTooltip}>
                    · ⚠ {unmatchedCount} {t.brazilMap.unmatchedWarning}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-foreground">{t.brazilMap.title}</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {t.d3chart.numberOfProjects}:{" "}
                  <span className="font-medium text-foreground">
                    {totalCount ?? data.reduce((s, d) => s + d.value, 0)}
                  </span>
                </span>
                {noStateCount > 0 && (
                  <span title={t.brazilMap.noStateTooltip}>
                    · ⚠ {noStateCount} {t.brazilMap.noStateWarning}
                  </span>
                )}
              </div>
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
            />
          )}

          {/* ── Legend ── */}
          <Legend variant="map" />
        </div>
      )}
    </div>
  );
}

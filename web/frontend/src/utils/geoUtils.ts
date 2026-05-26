// ─── IBGE state codes (sigla → numeric code) ─────────────────────────────────
export const STATE_CODES: Record<string, string> = {
  RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
  MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27",
  SE: "28", BA: "29", MG: "31", ES: "32", RJ: "33", SP: "35", PR: "41",
  SC: "42", RS: "43", MS: "50", MT: "51", GO: "52", DF: "53",
};

// ─── GeoJSON ring winding correction ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rewindGeometry(geom: any): any {
  if (!geom) return geom;
  if (geom.type === "Polygon") {
    return {
      ...geom,
      coordinates: geom.coordinates.map((ring: number[][], i: number) =>
        rewindRing(ring, i === 0),
      ),
    };
  }
  if (geom.type === "MultiPolygon") {
    return {
      ...geom,
      coordinates: geom.coordinates.map((poly: number[][][]) =>
        poly.map((ring, i) => rewindRing(ring, i === 0)),
      ),
    };
  }
  return geom;
}

export function rewindRing(coords: number[][], clockwise: boolean): number[][] {
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1];
  }
  if (clockwise !== area < 0) coords.reverse();
  return coords;
}

// ─── City name normalization (for matching against IBGE names) ────────────────
export function normalizeCity(s: string): string {
  return s
    // Remove state suffix: "Indaiatuba (SP)" → "Indaiatuba"
    .replace(/\s*\([A-Z]{2}\)\s*$/, "")
    // Remove slash-state: "São Paulo/São Paulo" → "São Paulo"
    .replace(/\/.*$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ─── Choropleth color scale ───────────────────────────────────────────────────
export const MAP_COLORS = ["#B6E5ED", "#6EC2CF", "#3BBACE", "#20A2B6", "#187B8B"];
export const MAP_EMPTY = "#D4D4D8";

export function countToColor(count: number, maxCount: number): string {
  if (!count || maxCount === 0) return MAP_EMPTY;
  const idx = Math.min(
    Math.floor((count / maxCount) * MAP_COLORS.length),
    MAP_COLORS.length - 1,
  );
  return MAP_COLORS[idx];
}

/** Sunrise and sunset (NOAA approximation), good to a couple of minutes. Returns ISO strings or null (polar day/night). */
export function sunTimes(date: Date, lat: number, lon: number): { sunrise: string | null; sunset: string | null } {
  const rad = Math.PI / 180;
  const day = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 864e5);
  const g = ((2 * Math.PI) / 365) * (day - 1);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const cosH = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl);
  if (cosH > 1 || cosH < -1) return { sunrise: null, sunset: null };
  const ha = Math.acos(cosH) / rad;
  const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const at = (mins: number) => new Date(base + mins * 60000).toISOString();
  return { sunrise: at(720 - 4 * (lon + ha) - eqtime), sunset: at(720 - 4 * (lon - ha) - eqtime) };
}

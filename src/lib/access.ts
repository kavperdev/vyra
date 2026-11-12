/** How long a one-off package gives access to the app (days): Start 8 weeks, 12-week plan, consultation. */
export function accessDays(plan: string): number {
  const p = plan.toLowerCase();
  if (p.includes("method")) return 365;
  if (p.includes("start") && !p.includes("startowy")) return 63;
  if (p.includes("12")) return 91;
  if (p.includes("konsult")) return 21;
  return 35;
}

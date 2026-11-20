/**
 * What Puls remembers about the runner between conversations: short facts in their own words
 * ("basen w poniedziałki i czwartki", "po maratonie tętno spoczynkowe wyższe"). Puls proposes them,
 * the runner sees and removes them on the memory screen. Synced with the account.
 */

export const MEMORY_KEY = "vyra-puls-memory";
export type Fact = { id: string; text: string; at: string };
const MAX = 60;

export function validMemory(v: unknown): Fact[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((f) => f && typeof f.text === "string" && f.text.trim())
    .map((f) => ({ id: typeof f.id === "string" ? f.id : Math.random().toString(36).slice(2, 10), text: String(f.text).trim().slice(0, 200), at: typeof f.at === "string" ? f.at : "" }))
    .slice(-MAX);
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();

/** Add facts, skipping ones already there (same words). Returns the new list and what was added. */
export function addFacts(all: Fact[], texts: string[], today: string): { next: Fact[]; added: string[] } {
  const seen = new Set(all.map((f) => norm(f.text)));
  const added: string[] = [];
  const next = [...all];
  for (const raw of texts) {
    const text = raw.trim().replace(/^[-–•]\s*/, "").slice(0, 200);
    if (text.length < 4 || seen.has(norm(text))) continue;
    seen.add(norm(text));
    added.push(text);
    next.push({ id: Math.random().toString(36).slice(2, 10), text, at: today });
  }
  return { next: next.slice(-MAX), added };
}

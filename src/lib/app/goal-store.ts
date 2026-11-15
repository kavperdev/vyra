import { GOAL_KEY, type GoalStore } from "@/lib/app/goal-plan";
import { save } from "@/lib/app/store";

/** The runner's race goal on the phone. The plan itself (goal-plan.ts) is pure, so the server can build it too. */
export function readGoal(): GoalStore | null {
  try {
    const v = JSON.parse(localStorage.getItem(GOAL_KEY) ?? "null");
    return v && v.race && v.p5k ? { done: [], ...v } : null;
  } catch {
    return null;
  }
}
export function writeGoal(v: GoalStore | null) {
  save(GOAL_KEY, v);
}

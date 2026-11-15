import { GoalPlanView } from "@/components/app/goal-plan";
import { PageHead } from "@/components/app/ui";

export const metadata = { title: "Plan pod start" };

export default function AppGoal() {
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Plan pod start" sub="Wybierz bieg i datę. Plan z tempami z Twojej formy, tydzień po tygodniu aż do startu." />
      <GoalPlanView />
    </div>
  );
}

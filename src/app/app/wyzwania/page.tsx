import { Trophy } from "lucide-react";
import { MyChallengeLink } from "@/components/app/my-challenge";
import { Chip, Group, PageHead, Row } from "@/components/app/ui";
import { challengeState, listChallenges } from "@/lib/data/challenges";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Wyzwania" };

export default async function AppChallenges() {
  const { t } = await getT();
  const all = (await listChallenges(await createClient()).catch(() => [])).filter((c) => c.visible);
  const order = { live: 0, upcoming: 1, ended: 2 } as const;
  const list = all.sort((a, b) => order[challengeState(a)] - order[challengeState(b)]);
  const label = { live: t("trwa", "live"), upcoming: t("wkrótce", "soon"), ended: t("koniec", "ended") };
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={t("Wyzwania", "Challenges")} sub={t("Biegasz gdziekolwiek, liczysz się razem z całą społecznością. Za darmo.", "Run anywhere, count with the whole community. Free.")} />
      <MyChallengeLink />
      <Group>
        {list.length ? (
          list.map((c) => {
            const st = challengeState(c);
            return (
              <Row
                key={c.id}
                href={`/app/wyzwania/${c.slug}`}
                icon={<Trophy className="size-4" />}
                title={c.title}
                sub={`${formatDate(c.starts_on, "d MMM")} – ${formatDate(c.ends_on, "d MMM yyyy")}${c.goal ? ` · ${t("cel", "goal")} ${c.goal} ${c.kind === "runs" ? t("biegów", "runs") : "km"}` : ""}`}
                right={<Chip tone={st === "live" ? "good" : "quiet"}>{label[st]}</Chip>}
              />
            );
          })
        ) : (
          <p className="px-4 py-5 text-[13px] text-white/45">{t("Nowe wyzwanie już niedługo.", "A new challenge is coming soon.")}</p>
        )}
      </Group>
    </div>
  );
}

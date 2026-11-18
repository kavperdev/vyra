import { Suspense } from "react";
import { FriendsTabs } from "@/components/app/friends-tabs";
import { PageHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Znajomi" };

export default async function AppFriends() {
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Ekipa" sub="Treningi znajomych, 🔥 i komentarze. Ranking kilometrów." />
      <Suspense>
        <FriendsTabs signedIn={!!user} />
      </Suspense>
    </div>
  );
}

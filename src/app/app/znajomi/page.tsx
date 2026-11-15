import { FriendsView } from "@/components/app/friends";
import { PageHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Znajomi" };

export default async function AppFriends() {
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Znajomi" sub="Ranking kilometrów z ludźmi, z którymi biegasz." />
      <FriendsView signedIn={!!user} />
    </div>
  );
}

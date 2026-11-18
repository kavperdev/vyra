"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FriendsView } from "@/components/app/friends";
import { MomentsFeed } from "@/components/app/moments";
import { Seg } from "@/components/app/tools";

/** Znajomi: the feed of friends' trainings (Ekipa) and the kilometre ranking with friend codes. */
export function FriendsTabs({ signedIn }: { signedIn: boolean }) {
  const q = useSearchParams();
  const [tab, setTab] = useState(q?.get("t") === "ranking" ? "ranking" : "ekipa");
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3">
      <Seg value={tab} onChange={setTab} opts={[{ k: "ekipa", label: "Ekipa" }, { k: "ranking", label: "Ranking i kody" }]} />
      {tab === "ekipa" ? <MomentsFeed signedIn={signedIn} onAddFriends={() => setTab("ranking")} /> : <FriendsView signedIn={signedIn} />}
    </div>
  );
}

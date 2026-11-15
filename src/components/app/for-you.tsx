"use client";

import { useEffect, useState } from "react";
import { Group, Row, SectionHead } from "@/components/app/ui";
import { ME_KEY, recommend, type Me } from "@/lib/app/me";
import { useAccess } from "@/components/app/access";

/** "For you": three next steps that fit the goal set on first launch. */
export function ForYou() {
  const [me, setMe] = useState<Me | null>(null);
  const { premium } = useAccess();
  useEffect(() => {
    try {
      const v = localStorage.getItem(ME_KEY);
      if (v) setMe(JSON.parse(v));
    } catch {
      /* none */
    }
  }, []);
  if (!me) return null;
  return (
    <>
      <SectionHead title="Dla Ciebie" />
      <Group>
        {recommend(me).filter((r) => !(premium && r.href === "/app/sklep")).map((r) => (
          <Row key={r.href} href={r.href} title={r.title} sub={r.sub} />
        ))}
      </Group>
    </>
  );
}

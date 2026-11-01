"use client";

import { PanelError } from "@/components/shell/panel-error";

export default function PanelErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PanelError error={error} reset={reset} home="/coach" />;
}

"use client";

import { useEffect, useState } from "react";

/** True inside the Google Play / App Store builds (cookie set by the store app). */
export function useStoreApp(): boolean {
  const [s, setS] = useState(false);
  useEffect(() => {
    setS(/(?:^|;\s*)app-platform=/.test(document.cookie));
  }, []);
  return s;
}

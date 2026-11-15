"use client";

import { createContext, useContext } from "react";

/** What the signed-in runner already has, so the app never offers what they bought. */
export type Access = { signedIn: boolean; premium: boolean };
const Ctx = createContext<Access>({ signedIn: false, premium: false });

export function AccessProvider({ value, children }: { value: Access; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAccess = () => useContext(Ctx);

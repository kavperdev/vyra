import { redirect } from "next/navigation";

/** Progress now lives in Forma, tab "Historia i rekordy". */
export default function AppProgress() {
  redirect("/app/forma?t=historia");
}

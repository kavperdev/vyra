import { redirect } from "next/navigation";

// The brand home page is being designed. Until then the root opens the platform.
export default function Home() {
  redirect("/panel");
}

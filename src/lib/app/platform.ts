import { cookies } from "next/headers";

/**
 * The app installed from Google Play (Android TWA) or the App Store (iOS shell) sets the "app-platform" cookie.
 * In those builds nothing is sold and nothing points to buying: store rules for digital services.
 */
export const PLATFORM_COOKIE = "app-platform";

export async function storeApp(): Promise<"android" | "ios" | null> {
  const v = (await cookies()).get(PLATFORM_COOKIE)?.value ?? "";
  if (!v) return null;
  return /ios/i.test(v) ? "ios" : "android";
}

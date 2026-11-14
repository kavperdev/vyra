/** Shown instantly on every tap while the next screen loads, so the app never feels frozen. */
export default function AppLoading() {
  return (
    <div aria-busy className="grid grid-cols-1 gap-3 pt-2">
      <div className="h-9 w-2/3 animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="h-4 w-1/2 animate-pulse rounded-lg bg-white/[0.04]" />
      <div className="mt-3 h-40 animate-pulse rounded-[20px] bg-[#111113]" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-24 animate-pulse rounded-[16px] bg-[#111113]" />
        <div className="h-24 animate-pulse rounded-[16px] bg-[#111113]" />
      </div>
      <div className="h-48 animate-pulse rounded-[20px] bg-[#111113]" />
    </div>
  );
}

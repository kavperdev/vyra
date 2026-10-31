import { cn } from "@/lib/utils";

/**
 * The VYRA wordmark, traced 1:1 from the supplied logo artwork (public/branding/vyra-logo.svg).
 * Drawn with currentColor so it follows the theme. Proportions are fixed by the viewBox.
 */
export function Logo({ className, title = "VYRA" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 916 150" role="img" aria-label={title} className={cn("h-4 w-auto fill-current", className)}>
      <path
        fillRule="evenodd"
        d={LOGO_PATH}
      />
    </svg>
  );
}

/** Round badge with the V glyph, used where the full wordmark does not fit (favicon style). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={cn("size-8", className)}>
      <circle cx="256" cy="256" r="256" className="fill-foreground" />
      <path className="fill-background" d={MARK_PATH} />
    </svg>
  );
}

// Path data traced from public/branding/source/vyra-badge-original.png (see README → Branding).
export const LOGO_PATH = "M912.0,144.5 L873.8,82.0 L828.5,5.5 L825.8,4.2 L800.0,4.5 L799.0,5.2 L715.2,145.0 L749.2,145.2 L810.8,43.8 L814.0,39.8 L877.0,144.8 L911.8,145.2 Z M497.2,4.8 L497.5,30.8 L613.5,31.0 L619.8,33.0 L625.5,37.5 L630.0,44.2 L631.8,51.2 L630.8,60.2 L626.5,68.2 L621.0,73.0 L613.2,75.8 L498.0,75.8 L497.2,76.2 L497.8,102.2 L580.2,102.2 L623.5,145.0 L662.5,145.0 L621.8,102.8 L622.5,101.5 L631.5,98.8 L637.2,95.5 L646.8,87.2 L653.8,76.8 L657.8,65.0 L658.8,58.8 L658.8,48.8 L655.8,36.0 L651.8,27.5 L646.0,20.0 L640.8,15.0 L635.8,11.2 L627.0,7.0 L615.5,4.5 Z M249.5,4.5 L249.5,5.5 L331.5,95.2 L332.0,145.0 L358.0,145.5 L359.8,144.8 L360.2,95.2 L442.2,5.0 L404.5,4.5 L349.2,64.5 L345.5,67.5 L287.0,4.5 Z M4.5,4.5 L91.5,145.2 L119.2,145.2 L120.2,144.5 L206.5,5.5 L206.2,4.5 L202.8,4.2 L172.2,4.5 L171.0,5.5 L106.5,111.2 L105.2,112.0 L40.0,5.2 L38.8,4.2 Z";
export const MARK_PATH = "M128.0,167.0 L238.3,345.3 L273.4,345.3 L274.6,344.5 L384.0,168.3 L383.6,167.0 L379.3,166.7 L340.5,167.0 L339.0,168.3 L257.3,302.3 L255.6,303.3 L173.0,167.9 L171.5,166.7 Z";

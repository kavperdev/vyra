import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] font-medium",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-2 text-muted",
        planned: "border-planned/30 bg-planned/10 text-planned",
        active: "border-planned/30 bg-planned/10 text-planned",
        done: "border-done/30 bg-done/10 text-done",
        warning: "border-warning/30 bg-warning/10 text-warning",
        problem: "border-problem/30 bg-problem/10 text-problem",
        accent: "border-accent/40 bg-accent/10 text-accent",
        outline: "border-border-strong text-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-border bg-surface-2 px-3 text-[15px] text-foreground placeholder:text-subtle transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 aria-[invalid=true]:border-problem";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(control, "h-11 sm:h-10", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(control, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />,
);
Textarea.displayName = "Textarea";

/** Native select: best keyboard and mobile behaviour, styled to match. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        control,
        "select-chevron h-11 appearance-none pr-9 sm:h-10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-muted", className)} {...props} />;
}

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn("size-5 shrink-0 cursor-pointer rounded border-border-strong accent-[var(--accent)]", className)}
      {...props}
    />
  );
}

interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  unit?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + unit + hint/error, with the error tied to the control for screen readers. */
export function Field({ label, htmlFor, error, hint, unit, className, children }: FieldProps) {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {unit ? <span className="ml-1 text-subtle">({unit})</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-[13px] text-problem">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

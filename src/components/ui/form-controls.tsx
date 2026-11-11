import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-border bg-surface-2 px-3 text-[15px] text-foreground placeholder:text-subtle transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 aria-[invalid=true]:border-problem";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  if (props.type === "date" || props.type === "time") return <DateTimeInput ref={ref} className={className} {...props} />;
  return <input ref={ref} className={cn(control, "h-11 sm:h-10", className)} {...props} />;
});
Input.displayName = "Input";

function fmtDateValue(v: string, type: string | undefined): string {
  if (!v) return "";
  if (type === "time") return v.slice(0, 5);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : v;
}

/**
 * Date and time fields: iOS Safari draws the native control with its own width (it spills out of
 * the layout) and shows nothing while empty. The native input stays (same value, same events,
 * the system picker on tap) but is transparent and fills a box that shows the value as text.
 */
const DateTimeInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, placeholder, onChange, ...props }, ref) => {
  const inner = React.useRef<HTMLInputElement | null>(null);
  const [shown, setShown] = React.useState<string>(typeof props.value === "string" ? props.value : typeof props.defaultValue === "string" ? props.defaultValue : "");
  React.useEffect(() => {
    if (typeof props.value === "string") setShown(props.value);
  }, [props.value]);
  React.useEffect(() => {
    // Values set by a form library through the ref (reset, setValue) do not fire events.
    const el = inner.current;
    if (!el) return;
    const sync = () => setShown(el.value);
    sync();
    const t = window.setInterval(sync, 500);
    return () => window.clearInterval(t);
  }, []);
  const setRefs = (el: HTMLInputElement | null) => {
    inner.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };
  const label = fmtDateValue(shown, props.type);
  return (
    <div className={cn(control, "relative flex h-11 min-w-0 items-center overflow-hidden sm:h-10", className)}>
      <span className={cn("pointer-events-none truncate", label ? "num" : "text-subtle")}>{label || placeholder || (props.type === "time" ? "--:--" : "dd.mm.rrrr")}</span>
      <input
        ref={setRefs}
        {...props}
        onChange={(e) => {
          setShown(e.target.value);
          onChange?.(e);
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ WebkitAppearance: "none", appearance: "none" }}
      />
    </div>
  );
});
DateTimeInput.displayName = "DateTimeInput";

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

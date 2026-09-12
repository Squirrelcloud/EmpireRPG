import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-accent text-accent-fg hover:bg-fg shadow-border",
  secondary:
    "bg-elevated text-fg shadow-border hover:shadow-border-hover",
  ghost: "text-muted hover:text-fg",
  heat: "bg-heat text-fg",
} as const;

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-[transform,box-shadow] duration-150 ease-out enabled:active:scale-[0.96] disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

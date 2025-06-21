import React from "react";
import { cn } from "../../lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  className?: string;
}

export function Textarea({
  label,
  placeholder = "Enter text...",
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div
      className={cn(
        "relative bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 rounded-xl border-2 border-primary/70 shadow-lg p-1 flex flex-col gap-1",
        className
      )}
    >
      {label && (
        <label className="text-xs font-semibold text-primary/80 pl-2 pt-1 pb-0.5 select-none tracking-wide">
          {label}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        rows={4}
        className={cn(
          "w-full bg-zinc-950/80 resize-none text-base text-white placeholder:text-zinc-400 px-4 py-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-primary/60 shadow-inner shadow-zinc-900/40 transition-all duration-150 min-h-[96px]",
        )}
        {...props}
      />
    </div>
  );
}
